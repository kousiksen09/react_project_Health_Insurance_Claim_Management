using HealthInsuranceClaimAPI.DTOs;
using HealthInsuranceClaimAPI.Models;
using HealthInsuranceClaimAPI.Enums;

namespace HealthInsuranceClaimAPI.Interfaces.IRepository
{
    public interface IClaimRepository : IGenericRepository<Claim>
    {
        Task<IEnumerable<ClaimDto>> GetByCustomerIdAsync(int customerId);
        Task<IEnumerable<ClaimDto>> GetPendingAsync();
        Task<IEnumerable<ClaimDto>> GetUnassignedPendingAsync();
        Task<IEnumerable<ClaimDto>> GetAllClaimsAsync();
        new Task<int> GetCountAsync();
        Task<int> GetCountByStatusAsync(ClaimStatus status);
        Task<Claim?> GetByIdWithIncludesAsync(int id);
        Task<IEnumerable<Claim>> GetByClaimOfficerIdAsync(int claimOfficerId);
        Task<IEnumerable<ClaimDto>> GetClaimsByOfficerIdAsync(int claimOfficerId);
        Task<IEnumerable<ClaimDto>> GetPendingClaimsByOfficerIdAsync(int claimOfficerId);
    }
}
