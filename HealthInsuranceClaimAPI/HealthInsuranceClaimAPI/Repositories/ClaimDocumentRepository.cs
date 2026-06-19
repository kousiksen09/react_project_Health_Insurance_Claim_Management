using HealthInsuranceClaimAPI.Data;
using HealthInsuranceClaimAPI.Interfaces.IRepository;
using HealthInsuranceClaimAPI.Models;
using Microsoft.EntityFrameworkCore;

namespace HealthInsuranceClaimAPI.Repositories
{
    public class ClaimDocumentRepository : GenericRepository<ClaimDocument>, IClaimDocumentRepository
    {
        public ClaimDocumentRepository(HealthInsuranceContext context) : base(context)
        {
        }

        public async Task<IEnumerable<ClaimDocument>> GetByClaimIdAsync(int claimId)
        {
            return await _dbSet
                .Where(cd => cd.ClaimId == claimId)
                .ToListAsync();
        }
    }
}