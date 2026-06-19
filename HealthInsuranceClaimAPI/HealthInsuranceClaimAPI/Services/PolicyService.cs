using AutoMapper;
using HealthInsuranceClaimAPI.DTOs;
using HealthInsuranceClaimAPI.Enums;
using HealthInsuranceClaimAPI.Interfaces.IRepository;
using HealthInsuranceClaimAPI.Interfaces.IService;
using HealthInsuranceClaimAPI.Models;

namespace HealthInsuranceClaimAPI.Services
{
    public class PolicyService : IPolicyService
    {
        private readonly IPolicyRepository _policyRepository;
        private readonly ICustomerRepository _customerRepository;
        private readonly ICustomerPolicyRepository _customerPolicyRepository;
        private readonly INotificationService _notificationService;
        private readonly IMapper _mapper;

        public PolicyService(
            IPolicyRepository policyRepository,
            ICustomerRepository customerRepository,
            ICustomerPolicyRepository customerPolicyRepository,
            INotificationService notificationService,
            IMapper mapper)
        {
            _policyRepository = policyRepository;
            _customerRepository = customerRepository;
            _customerPolicyRepository = customerPolicyRepository;
            _notificationService = notificationService;
            _mapper = mapper;
        }

        public async Task<IEnumerable<PolicyDto>> GetPoliciesAsync()
        {
            var policies = await _policyRepository.GetActiveAsync();
            return _mapper.Map<IEnumerable<PolicyDto>>(policies);
        }

        public async Task<PolicyDto?> GetPolicyByIdAsync(int id)
        {
            var policy = await _policyRepository.GetByIdAsync(id);
            if (policy == null || !policy.IsActive)
                return null;
            return _mapper.Map<PolicyDto>(policy);
        }

        public async Task<IEnumerable<PolicyDto>> SearchPoliciesAsync(string searchTerm)
        {
            var policies = await _policyRepository.FindAsync(p => 
                p.IsActive && 
                (p.Name.Contains(searchTerm) || p.Description.Contains(searchTerm)));
            return _mapper.Map<IEnumerable<PolicyDto>>(policies);
        }

        public async Task<IEnumerable<PolicyDto>> FilterPoliciesAsync(PolicyType? policyType, decimal? minPremium, decimal? maxPremium, decimal? minCoverage, decimal? maxCoverage)
        {
            var policies = await _policyRepository.FindAsync(p => 
                p.IsActive &&
                (!policyType.HasValue || p.PolicyType == policyType) &&
                (!minPremium.HasValue || p.Premium >= minPremium) &&
                (!maxPremium.HasValue || p.Premium <= maxPremium) &&
                (!minCoverage.HasValue || p.CoverageAmount >= minCoverage) &&
                (!maxCoverage.HasValue || p.CoverageAmount <= maxCoverage));
            return _mapper.Map<IEnumerable<PolicyDto>>(policies);
        }

        public async Task<string> PurchasePolicyAsync(PurchasePolicyDto purchaseDto, int userId)
        {
            var customer = await _customerRepository.GetByUserIdAsync(userId);
            if (customer == null)
                throw new ArgumentException("Customer not found");

            var policy = await _policyRepository.GetByIdAsync(purchaseDto.PolicyId);
            if (policy == null || !policy.IsActive)
                throw new ArgumentException("Policy not found or inactive");

            
            var today = DateTime.Today;
            var age = today.Year - customer.DateOfBirth.Year;
            if (customer.DateOfBirth.Date > today.AddYears(-age)) age--;

            var (minAge, maxAge) = GetAgeEligibility(policy.PolicyType);
            if (age < minAge || age > maxAge)
                throw new ArgumentException($"Age {age} is not eligible for this policy. Required age: {minAge}-{maxAge} years");

            if (await _customerPolicyRepository.HasActivePolicyAsync(customer.Id, policy.Id))
                throw new ArgumentException("Customer already has this policy");

            var policyNumber = $"POL{DateTime.Now:yyyyMMdd}{new Random().Next(1000, 9999)}";
            
            var customerPolicy = new CustomerPolicy
            {
                CustomerId = customer.Id,
                PolicyId = policy.Id,
                PolicyNumber = policyNumber,
                PurchaseDate = DateTime.UtcNow,
                ExpiryDate = DateTime.UtcNow.AddMonths(policy.DurationMonths)
            };

            await _customerPolicyRepository.CreateAsync(customerPolicy);

            await _notificationService.CreateNotificationAsync(
                userId,
                "Policy Purchased",
                $"You have successfully purchased {policy.Name} policy.",
                NotificationType.PolicyPurchase
            );

            return "Policy purchased successfully";
        }

        public async Task<IEnumerable<CustomerPolicyDto>> GetMyPoliciesAsync(int userId)
        {
            var customer = await _customerRepository.GetByUserIdAsync(userId);
            if (customer == null)
                throw new ArgumentException("Customer not found");

            var customerPolicies = await _customerPolicyRepository.GetByCustomerIdAsync(customer.Id);
            return _mapper.Map<IEnumerable<CustomerPolicyDto>>(customerPolicies);
        }

        private static (int minAge, int maxAge) GetAgeEligibility(PolicyType policyType)
        {
            return policyType switch
            {
                PolicyType.Individual => (18, 65),
                PolicyType.Family => (18, 65),
                PolicyType.Senior => (60, 80),
                _ => (18, 65)
            };
        }
    }
}