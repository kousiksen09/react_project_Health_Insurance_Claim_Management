using HealthInsuranceClaimAPI.Enums;
using System.ComponentModel.DataAnnotations;

namespace HealthInsuranceClaimAPI.DTOs
{
    public class PolicyFilterDto
    {
        public string? SearchTerm { get; set; }
        public PolicyType? PolicyType { get; set; }
        
        [Range(0, double.MaxValue)]
        public decimal? MinPremium { get; set; }
        
        [Range(0, double.MaxValue)]
        public decimal? MaxPremium { get; set; }
        
        [Range(0, double.MaxValue)]
        public decimal? MinCoverage { get; set; }
        
        [Range(0, double.MaxValue)]
        public decimal? MaxCoverage { get; set; }
    }
}