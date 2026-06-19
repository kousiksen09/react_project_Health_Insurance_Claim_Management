using System.ComponentModel.DataAnnotations;
using HealthInsuranceClaimAPI.Models;
using HealthInsuranceClaimAPI.Enums;

namespace HealthInsuranceClaimAPI.DTOs
{
    public class ClaimDto
    {
        public int Id { get; set; }
        public string ClaimNumber { get; set; } = string.Empty;
        public decimal ClaimAmount { get; set; }
        public string TreatmentDetails { get; set; } = string.Empty;
        public DateTime TreatmentDate { get; set; }
        public DateTime SubmissionDate { get; set; }
        public ClaimStatus Status { get; set; }
        public string? RejectionReason { get; set; }
        
        public string? DocumentRequest { get; set; }

        public decimal? ApprovedAmount { get; set; }
        public DateTime? ProcessedDate { get; set; }
        public string CustomerName { get; set; } = string.Empty;
        public string HospitalName { get; set; } = string.Empty;
        public string? ClaimOfficerName { get; set; }
    }

    public class CreateClaimDto
    {
        [Required]
        [StringLength(50)]
        public string PolicyNumber { get; set; } = string.Empty;
        
        [Required]
        [Range(0.01, double.MaxValue)]
        public decimal ClaimAmount { get; set; }
        
        [Required]
        [StringLength(1000)]
        public string TreatmentDetails { get; set; } = string.Empty;
        
        [Required]
        public DateTime TreatmentDate { get; set; }
        
        public List<IFormFile> Documents { get; set; } = new();
        
        public List<string> DocumentTypes { get; set; } = new();
    }

    public class ProcessClaimDto
    {
        [Required]
        public ClaimStatus Status { get; set; }
        
        [StringLength(500)]
        public string? RejectionReason { get; set; }
        
        [Range(0.01, double.MaxValue)]
        public decimal? ApprovedAmount { get; set; }
        
        public string? DocumentRequest { get; set; }
    }
}