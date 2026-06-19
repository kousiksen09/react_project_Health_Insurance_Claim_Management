using HealthInsuranceClaimAPI.DTOs;
using HealthInsuranceClaimAPI.Models;

namespace HealthInsuranceClaimAPI.Interfaces.IService
{
    public interface ICustomerService
    {
        Task<object> GetProfileAsync(int userId);
        Task<IEnumerable<ClaimDto>> GetMyClaimsAsync(int userId);
        Task<IEnumerable<PaymentHistoryDto>> GetPaymentHistoryAsync(int userId);
        Task<IEnumerable<PolicyDto>> GetAvailablePoliciesAsync(int userId);
        Task<PolicyDto> GetPolicyDetailsAsync(int policyId);

        Task<string> PurchasePolicyAsync(PurchasePolicyDto purchaseDto, int userId);
        Task<IEnumerable<CustomerPolicyDto>> GetMyPoliciesAsync(int userId);
        Task<string> RenewPolicyAsync(int customerPolicyId, int userId, string paymentMethod, string transactionNumber);
        Task<object> UpdateProfileAsync(int userId, UpdateCustomerProfileDto updateDto);
        Task<object> GetPremiumQuoteAsync(int policyId, int userId);
    }
}
