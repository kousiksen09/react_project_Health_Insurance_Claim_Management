using System.ComponentModel.DataAnnotations;
using HealthInsuranceClaimAPI.Enums;

namespace HealthInsuranceClaimAPI.Models
{
    public class Notification
    {
        public int Id { get; set; }
        
        [Required]
        public int UserId { get; set; }
        public User User { get; set; } = null!;
        
        [Required]
        public string Title { get; set; } = string.Empty;
        
        [Required]
        public string Message { get; set; } = string.Empty;
        
        [Required]
        public NotificationType Type { get; set; }
        
        public bool IsRead { get; set; } = false;
        
        [Required]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}