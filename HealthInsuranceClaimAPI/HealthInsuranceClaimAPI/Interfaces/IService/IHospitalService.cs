using HealthInsuranceClaimAPI.DTOs;

namespace HealthInsuranceClaimAPI.Interfaces.IService
{
    public interface IHospitalService
    {
        Task<string> SubmitClaimAsync(CreateClaimDto createClaimDto, int userId);
        Task<IEnumerable<ClaimDto>> GetMyClaimsAsync(int userId);
        Task<CustomerPolicyDto> GetCustomerPolicyAsync(string policyNumber);
        Task<IEnumerable<CustomerPolicyDto>> GetCustomerPoliciesAsync(int customerId);
        Task<IEnumerable<ClaimDto>> GetClaimsByStatusAsync(int userId, string status);
        Task<string> UploadAdditionalDocumentsAsync(int claimId, List<IFormFile> documents, List<string> documentTypes, int userId);
        Task<ProfileResponseDto> GetProfileAsync(int userId);
        Task<string> UpdateProfileAsync(int userId, UpdateHospitalProfileDto updateDto);
    }
}
