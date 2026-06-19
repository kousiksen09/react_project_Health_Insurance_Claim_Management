using System.ComponentModel.DataAnnotations;
using HealthInsuranceClaimAPI.Enums;

namespace HealthInsuranceClaimAPI.DTOs
{
    public class PolicyDto
    {
        public int Id { get; set; }
        public string PolicyId { get; set; } = "";
        public string Name { get; set; } = "";
        public string Description { get; set; } = "";
        public decimal Premium { get; set; }
        public decimal CoverageAmount { get; set; }
        public int DurationMonths { get; set; }
        public PolicyType PolicyType { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class PolicyResponseDto
    {
        public int PolicyId { get; set; }
        public string PolicyName { get; set; } = string.Empty;
        public string PolicyType { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public decimal CoverageAmount { get; set; }
        public decimal PremiumAmount { get; set; }
        public int DurationMonths { get; set; }
        public string Status { get; set; } = "Active";
        public DateTime CreatedAt { get; set; }
    }

    public class CreatePolicyRequest : BasePolicyDto
    {
    }

    public class PurchasePolicyDto
    {
        [Required]
        public int PolicyId { get; set; }
        
        [Required]
        [StringLength(100)]
        public string PaymentMethod { get; set; } = string.Empty;
        
        [Required]
        [StringLength(100)]
        public string TransactionNumber { get; set; } = string.Empty;
        
        public string? Notes { get; set; }
    }

    public class CustomerPolicyDto
    {
        public int Id { get; set; }
        public string CustomerName { get; set; } = string.Empty;
        public string PolicyName { get; set; } = string.Empty;
        public decimal CoverageAmount { get; set; }
        public decimal PremiumAmount { get; set; }
        public DateTime PurchaseDate { get; set; }
        public DateTime ExpiryDate { get; set; }
        public PolicyStatus Status { get; set; }
        public string PolicyNumber { get; set; } = string.Empty;
    }

    public class RenewPolicyDto
    {
        [Required]
        [StringLength(100)]
        public string PaymentMethod { get; set; } = string.Empty;
    }
}