using HealthInsuranceClaimAPI.Models;

namespace HealthInsuranceClaimAPI.Interfaces.IRepository
{
    public interface IClaimDocumentRepository : IGenericRepository<ClaimDocument>
    {
        Task<IEnumerable<ClaimDocument>> GetByClaimIdAsync(int claimId);
    }
}
