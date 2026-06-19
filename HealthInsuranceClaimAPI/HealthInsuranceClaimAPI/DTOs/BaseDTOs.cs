using System.ComponentModel.DataAnnotations;
using HealthInsuranceClaimAPI.Enums;

namespace HealthInsuranceClaimAPI.DTOs
{
    public class BasePolicyDto
    {
        [Required]
        [StringLength(100)]
        public string Name { get; set; } = string.Empty;

        [Required]
        [StringLength(500)]
        public string Description { get; set; } = string.Empty;

        [Required]
        [Range(0.01, double.MaxValue)]
        public decimal Premium { get; set; }

        [Required]
        [Range(0.01, double.MaxValue)]
        public decimal CoverageAmount { get; set; }

        [Required]
        [Range(1, 120)]
        public int DurationMonths { get; set; }

        [Required]
        public PolicyType PolicyType { get; set; }
    }

    public class BaseProfileUpdateDto
    {
        public IFormFile? ProfileImage { get; set; }
    }
}