using System.ComponentModel.DataAnnotations;
using HealthInsuranceClaimAPI.Enums;

namespace HealthInsuranceClaimAPI.Models
{
    public class CustomerPolicy
    {
        public int Id { get; set; }
        
        [Required]
        public int CustomerId { get; set; }
        public Customer Customer { get; set; } = null!;
        
        [Required]
        public int PolicyId { get; set; }
        public Policy Policy { get; set; } = null!;
        
        [Required]
        public string PolicyNumber { get; set; } = string.Empty;
        
        [Required]
        public DateTime PurchaseDate { get; set; }
        
        [Required]
        public DateTime ExpiryDate { get; set; }
        
        [Required]
        public PolicyStatus Status { get; set; } = PolicyStatus.Active;
        
        public ICollection<Claim> Claims { get; set; } = new List<Claim>();
        public ICollection<PaymentTransaction> PaymentTransactions { get; set; } = new List<PaymentTransaction>();
    }
}