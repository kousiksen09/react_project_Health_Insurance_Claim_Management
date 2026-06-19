using HealthInsuranceClaimAPI.Models;

namespace HealthInsuranceClaimAPI.Interfaces.IRepository
{
    public interface IClaimOfficerRepository : IGenericRepository<ClaimOfficer>
    {
        Task<ClaimOfficer?> GetByUserIdAsync(int userId);
        Task<IEnumerable<object>> GetAllWithUserAsync();
        new Task<int> GetCountAsync();
        Task<ClaimOfficer?> GetByIdWithUserAsync(int id);
        Task<User?> GetUserWithClaimOfficerAsync(int userId);
        Task UpdateUserAsync(User user);
    }
}
