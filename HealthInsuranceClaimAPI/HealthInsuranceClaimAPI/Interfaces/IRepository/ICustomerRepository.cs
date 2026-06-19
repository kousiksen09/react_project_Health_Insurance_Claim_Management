using HealthInsuranceClaimAPI.Models;

namespace HealthInsuranceClaimAPI.Interfaces.IRepository
{
    public interface ICustomerRepository : IGenericRepository<Customer>
    {
        Task<Customer?> GetByUserIdAsync(int userId);
        Task<IEnumerable<Customer>> GetAllWithUserAsync();
        new Task<int> GetCountAsync();
    }
}
