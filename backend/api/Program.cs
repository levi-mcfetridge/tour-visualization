// usings must be at the very top
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.WebUtilities;

var builder = WebApplication.CreateBuilder(args);

// Swagger & Minimal API helpers
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// HttpClient factory for outbound calls (Ticketmaster)
builder.Services.AddHttpClient();

// (Optional in dev) CORS — not required if you use the Angular dev proxy
builder.Services.AddCors(o => o.AddDefaultPolicy(p =>
    p.WithOrigins("http://localhost:4200")
     .AllowAnyHeader()
     .AllowAnyMethod()
));

var app = builder.Build();

// (Optional) enable the default CORS policy
app.UseCors();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// ---------------- Health check ----------------
app.MapGet("/api/ping", () => new { ok = true, msg = "pong" })
   .WithOpenApi();

// ---------------- Ticketmaster proxy with explicit query params ----------------
app.MapGet("/api/events", async (
        HttpContext ctx,               // gives access to request and cancellation token
        IHttpClientFactory http,       // create http client instance
        IConfiguration cfg,            // reads config values
        [AsParameters] EventsQuery q   // binds query string to record
    ) =>
{
    var apiKey = cfg["TM_API_KEY"];
    if (string.IsNullOrWhiteSpace(apiKey))
        return Results.Problem("TM_API_KEY not configured.");

    // Build a TM query dictionary with only non-empty values
    var query = new Dictionary<string, string?>(StringComparer.OrdinalIgnoreCase);
    void Add(string key, string? val)
    {
        if (!string.IsNullOrWhiteSpace(val))
            query[key] = val;
    }

    Add("keyword",            q.keyword);
    Add("countryCode",        q.countryCode);
    Add("city",               q.city);
    Add("stateCode",          q.stateCode);
    Add("classificationName", q.classificationName);  // e.g. "music"
    Add("attractionId",       q.attractionId);        // 🎵 artist filter

    if (q.size is int s) query["size"] = s.ToString();
    if (q.page is int p) query["page"] = p.ToString();
    Add("sort",               q.sort);

    // Always add your API key
    query["apikey"] = apiKey;

    var url = QueryHelpers.AddQueryString(
        "https://app.ticketmaster.com/discovery/v2/events.json",
        query
    );

    try
    {
        var json = await http.CreateClient().GetStringAsync(url, ctx.RequestAborted);
        return Results.Content(json, "application/json");
    }
    catch (HttpRequestException ex)
    {
        // This avoids a totally opaque 500 and lets you see what's wrong in Network tab
        return Results.Problem($"Ticketmaster error: {ex.Message}", statusCode: 502);
    }
})
.WithOpenApi();

app.Run();

// ---------------- Types must come AFTER app.Run() ----------------
public record EventsQuery(
    string? keyword,
    string? countryCode,
    string? city,
    string? stateCode,
    string? classificationName,
    string? attractionId,   // 🔹 new
    int?    size,
    int?    page,
    string? sort
);