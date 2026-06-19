using System.ComponentModel.DataAnnotations;
using HealthInsuranceClaimAPI.Enums;

namespace HealthInsuranceClaimAPI.Models
{
    public class User
    {
        public int Id { get; set; }
        
        [Required]
        [EmailAddress]
        [StringLength(100)]
        public string Email { get; set; } = string.Empty;
        
        [Required]
        [StringLength(500)]
        public string PasswordHash { get; set; } = string.Empty;
        
        [Required]
        public UserRole Role { get; set; }
        
        [StringLength(100)]
        public string? FirstName { get; set; }
        
        [StringLength(100)]
        public string? LastName { get; set; }
        
        [StringLength(500)]
        public string? ProfileImageUrl { get; set; }
        
        public bool IsActive { get; set; } = true;
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        public Customer? Customer { get; set; }
        public Hospital? Hospital { get; set; }
        public ClaimOfficer? ClaimOfficer { get; set; }
    }
}