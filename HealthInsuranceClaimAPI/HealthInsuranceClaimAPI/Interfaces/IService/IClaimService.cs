using HealthInsuranceClaimAPI.DTOs;

namespace HealthInsuranceClaimAPI.Interfaces.IService
{
    public interface IClaimService
    {
        Task<string> CreateClaimAsync(CreateClaimDto createClaimDto, int userId);
        Task<IEnumerable<ClaimDto>> GetClaimsAsync();
        Task<string> ProcessClaimAsync(int id, ProcessClaimDto processDto, int userId);
        Task<IEnumerable<ClaimDto>> GetMyClaimsAsync(int userId);
        Task<IEnumerable<ClaimDto>> GetPendingClaimsAsync();
        Task<string> ApproveClaimAsync(int id, decimal? approvedAmount, int userId);
        Task<string> RejectClaimAsync(int id, string rejectionReason, int userId);
    }
}
