using System.ComponentModel.DataAnnotations;
using HealthInsuranceClaimAPI.Enums;

namespace HealthInsuranceClaimAPI.Models
{
    public class PaymentTransaction
    {
        public int Id { get; set; }
        
        public int? CustomerPolicyId { get; set; }
        public CustomerPolicy? CustomerPolicy { get; set; }
        
        public int? ClaimId { get; set; }
        public Claim? Claim { get; set; }
        
        [Required]
        [Range(0.01, double.MaxValue, ErrorMessage = "Amount must be greater than 0")]
        public decimal Amount { get; set; }
        
        [Required]
        public PaymentType PaymentType { get; set; }
        
        [Required]
        public PaymentStatus Status { get; set; } = PaymentStatus.Completed;
        
        [Required]
        [StringLength(50)]
        public string TransactionNumber { get; set; } = string.Empty;
        
        [Required]
        public DateTime TransactionDate { get; set; } = DateTime.UtcNow;
        
        public string? PaymentMethod { get; set; }
        
        public string? Notes { get; set; }
    }
}