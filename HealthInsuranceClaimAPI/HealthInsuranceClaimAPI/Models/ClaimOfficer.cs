using System.ComponentModel.DataAnnotations;

namespace HealthInsuranceClaimAPI.Models
{
    public class ClaimOfficer
    {
        public int Id { get; set; }
        
        [Required]
        public int UserId { get; set; }
        public User User { get; set; } = null!;
        
        [StringLength(50)]
        public string? FirstName { get; set; }
        
        [StringLength(50)]
        public string? LastName { get; set; }
        
        public ICollection<Claim> Claims { get; set; } = new List<Claim>();
    }
}