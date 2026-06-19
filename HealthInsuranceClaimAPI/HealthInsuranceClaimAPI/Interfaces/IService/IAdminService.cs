using HealthInsuranceClaimAPI.DTOs;
using HealthInsuranceClaimAPI.Models;

namespace HealthInsuranceClaimAPI.Interfaces.IService
{
    public interface IAdminService
    {
        Task<object> GetDashboardAsync();
        Task<IEnumerable<object>> GetAllUsersAsync();
        Task<IEnumerable<object>> GetAllCustomersAsync();
        Task<string> ToggleCustomerStatusAsync(int userId);
        Task<IEnumerable<object>> GetAllHospitalsAsync();
        Task<string> ToggleUserStatusAsync(int id);
        Task<string> DeleteUserAsync(int id);
        Task<IEnumerable<object>> GetPoliciesAsync();
        Task<Policy?> GetPolicyAsync(int id);
        Task<Policy> CreatePolicyAsync(Policy policy);
        Task<string> UpdatePolicyAsync(int id, Policy policy);
        Task<string> DeletePolicyAsync(int id);
        Task<string> ArchivePolicyAsync(int id);
        Task<string> TogglePolicyStatusAsync(int id);
        Task<ClaimOfficerResponseDto> AddClaimOfficerAsync(AddClaimOfficerDto addDto);
        Task<IEnumerable<object>> GetClaimOfficersAsync();
        Task<string> ToggleClaimOfficerStatusAsync(int id);
        Task<string> DeleteClaimOfficerAsync(int id);
        Task<IEnumerable<ClaimDto>> GetAllClaimsAsync();
        Task<string> AssignClaimOfficerAsync(int claimId, int officerId);
        Task<ProfileResponseDto> GetProfileAsync(int userId);
        Task<string> UpdateProfileAsync(int userId, UpdateAdminProfileDto updateDto);
    }
}
