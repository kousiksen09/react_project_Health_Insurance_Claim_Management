using HealthInsuranceClaimAPI.Models;

namespace HealthInsuranceClaimAPI.Interfaces.IRepository
{
    public interface IHospitalRepository : IGenericRepository<Hospital>
    {
        Task<Hospital?> GetByUserIdAsync(int userId);
        Task<bool> LicenseExistsAsync(string licenseNumber);
        new Task<int> GetCountAsync();
        Task<IEnumerable<Hospital>> GetAllWithUserAsync();
    }
}
