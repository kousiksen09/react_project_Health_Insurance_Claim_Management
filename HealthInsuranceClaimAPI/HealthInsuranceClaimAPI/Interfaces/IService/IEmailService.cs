namespace HealthInsuranceClaimAPI.Interfaces.IService
{
    public interface IEmailService
    {
        Task SendEmailAsync(string toEmail, string subject, string body);
    }
}