using AutoMapper;
using HealthInsuranceClaimAPI.DTOs;
using HealthInsuranceClaimAPI.Interfaces.IRepository;
using HealthInsuranceClaimAPI.Interfaces.IService;
using HealthInsuranceClaimAPI.Models;
using HealthInsuranceClaimAPI.Enums;

namespace HealthInsuranceClaimAPI.Services
{
    public class ClaimService : IClaimService
    {
        private readonly IClaimRepository _claimRepository;
        private readonly IHospitalRepository _hospitalRepository;
        private readonly ICustomerRepository _customerRepository;
        private readonly IClaimOfficerRepository _claimOfficerRepository;
        private readonly ICustomerPolicyRepository _customerPolicyRepository;
        private readonly IClaimDocumentRepository _claimDocumentRepository;
        private readonly INotificationService _notificationService;
        private readonly IFileService _fileService;
        private readonly IMapper _mapper;

        public ClaimService(
            IClaimRepository claimRepository,
            IHospitalRepository hospitalRepository,
            ICustomerRepository customerRepository,
            IClaimOfficerRepository claimOfficerRepository,
            ICustomerPolicyRepository customerPolicyRepository,
            IClaimDocumentRepository claimDocumentRepository,
            INotificationService notificationService,
            IFileService fileService,
            IMapper mapper)
        {
            _claimRepository = claimRepository;
            _hospitalRepository = hospitalRepository;
            _customerRepository = customerRepository;
            _claimOfficerRepository = claimOfficerRepository;
            _customerPolicyRepository = customerPolicyRepository;
            _claimDocumentRepository = claimDocumentRepository;
            _notificationService = notificationService;
            _fileService = fileService;
            _mapper = mapper;
        }

        public async Task<string> CreateClaimAsync(CreateClaimDto createClaimDto, int userId)
        {
            var hospital = await _hospitalRepository.GetByUserIdAsync(userId);
            if (hospital == null)
                throw new ArgumentException("Hospital not found");

            var customerPolicy = await _customerPolicyRepository.GetByPolicyNumberAsync(createClaimDto.PolicyNumber);
            if (customerPolicy == null || customerPolicy.Status != PolicyStatus.Active)
                throw new ArgumentException("Customer policy not found or inactive");

            if (createClaimDto.Documents.Count != createClaimDto.DocumentTypes.Count)
                throw new ArgumentException("Document count must match document type count");

            var claimNumber = $"CLM{DateTime.Now:yyyyMMdd}{new Random().Next(1000, 9999)}";

            var claim = new Claim
            {
                CustomerPolicyId = customerPolicy.Id,
                HospitalId = hospital.Id,
                ClaimNumber = claimNumber,
                ClaimAmount = createClaimDto.ClaimAmount,
                TreatmentDetails = createClaimDto.TreatmentDetails,
                TreatmentDate = createClaimDto.TreatmentDate
            };

            await _claimRepository.CreateAsync(claim);

            for (int i = 0; i < createClaimDto.Documents.Count; i++)
            {
                var filePath = await _fileService.SaveFileAsync(createClaimDto.Documents[i], createClaimDto.DocumentTypes[i]);
                
                var document = new ClaimDocument
                {
                    ClaimId = claim.Id,
                    FileName = createClaimDto.Documents[i].FileName,
                    FilePath = filePath,
                    DocumentType = createClaimDto.DocumentTypes[i]
                };
                
                await _claimDocumentRepository.CreateAsync(document);
            }

            await _notificationService.CreateNotificationAsync(
                customerPolicy.Customer.UserId,
                "Claim Submitted",
                $"A claim has been submitted for your policy. Claim Number: {claimNumber}",
                NotificationType.ClaimSubmitted
            );

            return "Claim submitted successfully";
        }

        public async Task<IEnumerable<ClaimDto>> GetClaimsAsync()
        {
            var claims = await _claimRepository.GetAllAsync();
            return _mapper.Map<IEnumerable<ClaimDto>>(claims);
        }

        public async Task<string> ProcessClaimAsync(int id, ProcessClaimDto processDto, int userId)
        {
            var claimOfficer = await _claimOfficerRepository.GetByUserIdAsync(userId);
            if (claimOfficer == null)
                throw new ArgumentException("Claim officer not found");

            var claim = await _claimRepository.GetByIdAsync(id);
            if (claim == null)
                throw new ArgumentException("Claim not found");

            claim.ClaimOfficerId = claimOfficer.Id;
            claim.Status = processDto.Status;
            claim.ProcessedDate = DateTime.UtcNow;

            if (processDto.Status == ClaimStatus.Rejected)
                claim.RejectionReason = processDto.RejectionReason;
            else if (processDto.Status == ClaimStatus.Approved)
                claim.ApprovedAmount = processDto.ApprovedAmount ?? claim.ClaimAmount;

            await _claimRepository.UpdateAsync(claim);

            var statusMessage = processDto.Status switch
            {
                ClaimStatus.Approved => $"Your claim {claim.ClaimNumber} has been approved for ₹{claim.ApprovedAmount}",
                ClaimStatus.Rejected => $"Your claim {claim.ClaimNumber} has been rejected. Reason: {claim.RejectionReason}",
                _ => $"Your claim {claim.ClaimNumber} status has been updated to {processDto.Status}"
            };

            await _notificationService.CreateNotificationAsync(
                claim.CustomerPolicy.Customer.UserId,
                "Claim Status Update",
                statusMessage,
                NotificationType.ClaimStatusUpdate
            );

            await _notificationService.CreateNotificationAsync(
                claim.Hospital.UserId,
                "Claim Status Update",
                statusMessage,
                NotificationType.ClaimStatusUpdate
            );

            return "Claim processed successfully";
        }

        public async Task<IEnumerable<ClaimDto>> GetMyClaimsAsync(int userId)
        {
            var customer = await _customerRepository.GetByUserIdAsync(userId);
            if (customer == null)
                throw new ArgumentException("Customer not found");

            return await _claimRepository.GetByCustomerIdAsync(customer.Id);
        }

        public async Task<IEnumerable<ClaimDto>> GetPendingClaimsAsync()
        {
            return await _claimRepository.GetPendingAsync();
        }

        public async Task<string> ApproveClaimAsync(int id, decimal? approvedAmount, int userId)
        {
            var claimOfficer = await _claimOfficerRepository.GetByUserIdAsync(userId);
            if (claimOfficer == null)
                throw new ArgumentException("Claim officer not found");

            var claim = await _claimRepository.GetByIdAsync(id);
            if (claim == null)
                throw new ArgumentException("Claim not found");

            if (claim.Status != ClaimStatus.Submitted)
                throw new ArgumentException("Claim is not in submitted status");

            claim.ClaimOfficerId = claimOfficer.Id;
            claim.Status = ClaimStatus.Approved;
            claim.ApprovedAmount = approvedAmount ?? claim.ClaimAmount;
            claim.ProcessedDate = DateTime.UtcNow;

            await _claimRepository.UpdateAsync(claim);

            await _notificationService.CreateNotificationAsync(
                claim.CustomerPolicy.Customer.UserId,
                "Claim Approved",
                $"Your claim {claim.ClaimNumber} has been approved for ₹{claim.ApprovedAmount}",
                NotificationType.ClaimStatusUpdate
            );

            await _notificationService.CreateNotificationAsync(
                claim.Hospital.UserId,
                "Claim Approved",
                $"Claim {claim.ClaimNumber} has been approved for ₹{claim.ApprovedAmount}",
                NotificationType.ClaimStatusUpdate
            );

            return "Claim approved successfully";
        }

        public async Task<string> RejectClaimAsync(int id, string rejectionReason, int userId)
        {
            var claimOfficer = await _claimOfficerRepository.GetByUserIdAsync(userId);
            if (claimOfficer == null)
                throw new ArgumentException("Claim officer not found");

            var claim = await _claimRepository.GetByIdAsync(id);
            if (claim == null)
                throw new ArgumentException("Claim not found");

            if (claim.Status != ClaimStatus.Submitted)
                throw new ArgumentException("Claim is not in submitted status");

            if (string.IsNullOrEmpty(rejectionReason))
                throw new ArgumentException("Rejection reason is required");

            claim.ClaimOfficerId = claimOfficer.Id;
            claim.Status = ClaimStatus.Rejected;
            claim.RejectionReason = rejectionReason;
            claim.ProcessedDate = DateTime.UtcNow;

            await _claimRepository.UpdateAsync(claim);

            await _notificationService.CreateNotificationAsync(
                claim.CustomerPolicy.Customer.UserId,
                "Claim Rejected",
                $"Your claim {claim.ClaimNumber} has been rejected. Reason: {rejectionReason}",
                NotificationType.ClaimStatusUpdate
            );

            await _notificationService.CreateNotificationAsync(
                claim.Hospital.UserId,
                "Claim Rejected",
                $"Claim {claim.ClaimNumber} has been rejected. Reason: {rejectionReason}",
                NotificationType.ClaimStatusUpdate
            );

            return "Claim rejected successfully";
        }
    }
}