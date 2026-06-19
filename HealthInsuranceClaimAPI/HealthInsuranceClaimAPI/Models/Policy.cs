using System.ComponentModel.DataAnnotations;
using HealthInsuranceClaimAPI.Enums;
using System.Text.Json.Serialization;

namespace HealthInsuranceClaimAPI.Models
{
    public class Policy
    {
        public int Id { get; set; }
        
        [Required]
        [StringLength(20)]
        public string PolicyNumber { get; set; } = string.Empty;
        
        [Required]
        [StringLength(100)]
        public string Name { get; set; } = string.Empty;
        
        [Required]
        [StringLength(500)]
        public string Description { get; set; } = string.Empty;
        
        [Required]
        [Range(1, 1000000, ErrorMessage = "Premium must be between ₹1 and ₹10,00,000")]
        public decimal Premium { get; set; }
        
        [Required]
        [Range(10000, 10000000, ErrorMessage = "Coverage must be between ₹10,000 and ₹1,00,00,000")]
        public decimal CoverageAmount { get; set; }
        
        [Required]
        [Range(1, 120, ErrorMessage = "Duration must be between 1 and 120 months")]
        public int DurationMonths { get; set; }
        
        [Required]
        public PolicyType PolicyType { get; set; }
        
        public bool IsActive { get; set; } = true;
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        [JsonIgnore]
        public ICollection<CustomerPolicy> CustomerPolicies { get; set; } = new List<CustomerPolicy>();
    }
}