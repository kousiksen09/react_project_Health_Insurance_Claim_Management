using System.Net;
using System.Text.Json;

namespace HealthInsuranceClaimAPI.Middleware
{
    public class GlobalExceptionMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<GlobalExceptionMiddleware> _logger;
        private readonly IWebHostEnvironment _environment;

        public GlobalExceptionMiddleware(RequestDelegate next, ILogger<GlobalExceptionMiddleware> logger, IWebHostEnvironment environment)
        {
            _next = next;
            _logger = logger;
            _environment = environment;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            try
            {
                await _next(context);
                
                if (context.Response.StatusCode == 400 && !context.Response.HasStarted)
                {
                    context.Response.StatusCode = 200;
                    context.Response.ContentType = "application/json";
                    
                    var errorResponse = new
                    {
                        success = false,
                        message = "Validation failed - please check your input",
                        timestamp = DateTime.UtcNow
                    };
                    
                    await context.Response.WriteAsync(JsonSerializer.Serialize(errorResponse));
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An unhandled exception occurred");
                await HandleExceptionAsync(context, ex);
            }
        }

        private async Task HandleExceptionAsync(HttpContext context, Exception exception)
        {
            context.Response.ContentType = "application/json";
            context.Response.StatusCode = 200;

            var message = exception switch
            {
                ArgumentNullException => "Required parameter is missing",
                ArgumentException => exception.Message,
                UnauthorizedAccessException => "Access denied",
                KeyNotFoundException => "Resource not found",
                InvalidOperationException => exception.Message,
                _ => "An internal server error occurred"
            };

            var response = new
            {
                success = false,
                message,
                details = _environment.IsDevelopment() ? exception.ToString() : null,
                timestamp = DateTime.UtcNow
            };

            await context.Response.WriteAsync(JsonSerializer.Serialize(response));
        }
    }
}