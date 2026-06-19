using HealthInsuranceClaimAPI.DTOs;
using HealthInsuranceClaimAPI.Enums;

namespace HealthInsuranceClaimAPI.Interfaces.IService
{
    public interface IPolicyService
    {
        Task<IEnumerable<PolicyDto>> GetPoliciesAsync();
        Task<PolicyDto?> GetPolicyByIdAsync(int id);
        Task<IEnumerable<PolicyDto>> SearchPoliciesAsync(string searchTerm);
        Task<IEnumerable<PolicyDto>> FilterPoliciesAsync(PolicyType? policyType, decimal? minPremium, decimal? maxPremium, decimal? minCoverage, decimal? maxCoverage);
        Task<string> PurchasePolicyAsync(PurchasePolicyDto purchaseDto, int userId);
        Task<IEnumerable<CustomerPolicyDto>> GetMyPoliciesAsync(int userId);
    }
}
