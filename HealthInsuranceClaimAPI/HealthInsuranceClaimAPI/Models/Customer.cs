using System.ComponentModel.DataAnnotations;

namespace HealthInsuranceClaimAPI.Models
{
    public class Customer
    {
        public int Id { get; set; }
        
        [Required]
        [StringLength(20)]
        public string CustomerNumber { get; set; } = string.Empty;
        
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
        public DateTime DateOfBirth { get; set; }
        
        [Required]
        [Phone]
        [StringLength(15)]
        public string Phone { get; set; } = string.Empty;
        
        [Required]
        [StringLength(200)]
        public string Address { get; set; } = string.Empty;
        
        public ICollection<CustomerPolicy> CustomerPolicies { get; set; } = new List<CustomerPolicy>();
        public ICollection<Claim> Claims { get; set; } = new List<Claim>();
    }
}