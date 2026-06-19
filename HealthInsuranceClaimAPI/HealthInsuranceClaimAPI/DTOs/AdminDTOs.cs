using System.ComponentModel.DataAnnotations;
using HealthInsuranceClaimAPI.Enums;

namespace HealthInsuranceClaimAPI.DTOs
{
    public class CreatePolicyDto : BasePolicyDto
    {
    }

    public class UpdatePolicyDto : BasePolicyDto
    {
    }

    public class UpdateAdminProfileDto : BaseProfileUpdateDto
    {
        [Required]
        public string FirstName { get; set; } = string.Empty;
        [Required]
        public string LastName { get; set; } = string.Empty;
    }
}