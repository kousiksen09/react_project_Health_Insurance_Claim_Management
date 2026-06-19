using HealthInsuranceClaimAPI.Models;

namespace HealthInsuranceClaimAPI.Interfaces.IService
{
    public interface IJwtService
    {
        string GenerateToken(User user);
    }
}