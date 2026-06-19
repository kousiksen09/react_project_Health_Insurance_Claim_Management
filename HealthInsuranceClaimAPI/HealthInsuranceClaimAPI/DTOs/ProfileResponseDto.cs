using System.Text.Json.Serialization;

namespace HealthInsuranceClaimAPI.DTOs
{
    public class ProfileResponseDto
    {
        public int Id { get; set; }
        public string Email { get; set; } = string.Empty;
        public int Role { get; set; }
        public bool IsActive { get; set; }
        public string? FirstName { get; set; }
        public string? LastName { get; set; }
        public string? ProfileImageUrl { get; set; }
        
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public CustomerProfileDto? Customer { get; set; }
        
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public HospitalProfileDto? Hospital { get; set; }
        
    }

    public class CustomerProfileDto
    {
        public string CustomerNumber { get; set; } = string.Empty;
        public DateTime DateOfBirth { get; set; }
        public string Phone { get; set; } = string.Empty;
        public string Address { get; set; } = string.Empty;
    }

    public class HospitalProfileDto
    {
        public string Name { get; set; } = string.Empty;
        public string LicenseNumber { get; set; } = string.Empty;
        public string Address { get; set; } = string.Empty;
        public string ContactNumber { get; set; } = string.Empty;
    }
}