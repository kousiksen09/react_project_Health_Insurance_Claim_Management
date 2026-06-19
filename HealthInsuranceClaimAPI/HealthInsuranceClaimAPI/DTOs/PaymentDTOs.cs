using HealthInsuranceClaimAPI.Enums;

namespace HealthInsuranceClaimAPI.DTOs
{
    public class PaymentHistoryDto
    {
        public int Id { get; set; }
        public decimal Amount { get; set; }
        public DateTime TransactionDate { get; set; }
        public string PaymentMethod { get; set; } = string.Empty;
        public PaymentStatus Status { get; set; }
        public string? PolicyName { get; set; }
        public string TransactionNumber { get; set; } = string.Empty;
        public PaymentType PaymentType { get; set; }
        public string? ClaimNumber { get; set; }
    }
}