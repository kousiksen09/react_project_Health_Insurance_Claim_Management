using System.ComponentModel.DataAnnotations;

namespace HealthInsuranceClaimAPI.Models
{
    public class Hospital
    {
        public int Id { get; set; }
        
        [Required]
        public int UserId { get; set; }
        public User User { get; set; } = null!;
        
        [Required]
        [StringLength(50)]
        public string FirstName { get; set; } = string.Empty;
        
        [Required]
        [StringLength(50)]
        public string LastName { get; set; } = string.Empty;
        
        [Required]
        [StringLength(100)]
        public string Name { get; set; } = string.Empty;
        
        [Required]
        [StringLength(50)]
        public string LicenseNumber { get; set; } = string.Empty;
        
        [Required]
        [StringLength(200)]
        public string Address { get; set; } = string.Empty;
        
        [Required]
        [Phone]
        [StringLength(15)]
        public string ContactNumber { get; set; } = string.Empty;
        
        public ICollection<Claim> Claims { get; set; } = new List<Claim>();
    }
}