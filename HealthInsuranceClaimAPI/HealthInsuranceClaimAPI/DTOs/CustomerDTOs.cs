using HealthInsuranceClaimAPI.Enums;
using System.ComponentModel.DataAnnotations;

namespace HealthInsuranceClaimAPI.DTOs
{
    public class UpdateCustomerProfileDto : BaseProfileUpdateDto
    {
        [Required]
        public string FirstName { get; set; } = string.Empty;
        [Required]
        public string LastName { get; set; } = string.Empty;
        [Required]
        public string Phone { get; set; } = string.Empty;
        [Required]
        public string Address { get; set; } = string.Empty;
        [Required]
        public DateTime DateOfBirth { get; set; }
    }

    public class UpdateHospitalProfileDto : BaseProfileUpdateDto
    {
        [Required]
        public string FirstName { get; set; } = string.Empty;
        [Required]
        public string LastName { get; set; } = string.Empty;
        [Required]
        public string Name { get; set; } = string.Empty;
        [Required]
        public string Address { get; set; } = string.Empty;
        [Required]
        public string ContactNumber { get; set; } = string.Empty;
    }

    public class UpdateClaimOfficerProfileDto : BaseProfileUpdateDto
    {
        [Required]
        public string FirstName { get; set; } = string.Empty;
        [Required]
        public string LastName { get; set; } = string.Empty;
    }


}