using System.ComponentModel.DataAnnotations;

namespace HealthInsuranceClaimAPI.Models
{
    public class ClaimDocument
    {
        public int Id { get; set; }
        
        [Required]
        public int ClaimId { get; set; }
        public Claim Claim { get; set; } = null!;
        
        [Required]
        [StringLength(255)]
        public string FileName { get; set; } = string.Empty;
        
        [Required]
        [StringLength(500)]
        public string FilePath { get; set; } = string.Empty;
        
        [Required]
        [StringLength(50)]
        public string DocumentType { get; set; } = string.Empty;
        

        
        [Required]
        public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
    }
}