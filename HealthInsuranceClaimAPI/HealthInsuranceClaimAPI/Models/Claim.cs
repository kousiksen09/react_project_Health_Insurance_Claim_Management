using System.ComponentModel.DataAnnotations;
using HealthInsuranceClaimAPI.Enums;

namespace HealthInsuranceClaimAPI.Models
{
    public class Claim
    {
        public int Id { get; set; }
        
        [Required]
        public int CustomerPolicyId { get; set; }
        public CustomerPolicy CustomerPolicy { get; set; } = null!;
        
        [Required]
        public int HospitalId { get; set; }
        public Hospital Hospital { get; set; } = null!;
        
        public int? ClaimOfficerId { get; set; }
        public ClaimOfficer? ClaimOfficer { get; set; }
        
        [Required]
        [StringLength(50)]
        public string ClaimNumber { get; set; } = string.Empty;
        
        [Required]
        [Range(0.01, double.MaxValue, ErrorMessage = "Claim amount must be greater than 0")]
        public decimal ClaimAmount { get; set; }
        
        [Required]
        [StringLength(1000)]
        public string TreatmentDetails { get; set; } = string.Empty;
        
        [Required]
        public DateTime TreatmentDate { get; set; }
        
        [Required]
        public DateTime SubmissionDate { get; set; } = DateTime.UtcNow;
        
        [Required]
        public ClaimStatus Status { get; set; } = ClaimStatus.Submitted;
        
        public string? RejectionReason { get; set; }
        
        public string? DocumentRequest { get; set; }
        
        public decimal? ApprovedAmount { get; set; }
        
        public DateTime? ProcessedDate { get; set; }
        
        public ICollection<ClaimDocument> ClaimDocuments { get; set; } = new List<ClaimDocument>();
        public ICollection<PaymentTransaction> PaymentTransactions { get; set; } = new List<PaymentTransaction>();
    }
}