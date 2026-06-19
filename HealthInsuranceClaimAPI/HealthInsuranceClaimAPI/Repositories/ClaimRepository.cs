using HealthInsuranceClaimAPI.Data;
using HealthInsuranceClaimAPI.DTOs;
using HealthInsuranceClaimAPI.Interfaces.IRepository;
using HealthInsuranceClaimAPI.Models;
using HealthInsuranceClaimAPI.Enums;
using Microsoft.EntityFrameworkCore;

namespace HealthInsuranceClaimAPI.Repositories
{
    public class ClaimRepository : GenericRepository<Claim>, IClaimRepository
    {
        public ClaimRepository(HealthInsuranceContext context) : base(context)
        {
        }

        public async Task<IEnumerable<ClaimDto>> GetByCustomerIdAsync(int customerId)
        {
            return await _context.Claims
                .Where(c => c.CustomerPolicy.Customer.Id == customerId)
                .Include(c => c.Hospital)
                .Include(c => c.CustomerPolicy)
                    .ThenInclude(cp => cp.Policy)
                .Select(c => new ClaimDto
                {
                    Id = c.Id,
                    ClaimNumber = c.ClaimNumber,
                    ClaimAmount = c.ClaimAmount,
                    TreatmentDetails = c.TreatmentDetails,
                    TreatmentDate = c.TreatmentDate,
                    SubmissionDate = c.SubmissionDate,
                    Status = c.Status,
                    RejectionReason = c.RejectionReason,
                    ApprovedAmount = c.ApprovedAmount,
                    ProcessedDate = c.ProcessedDate,
                    HospitalName = c.Hospital.Name
                })
                .ToListAsync();
        }

        public async Task<IEnumerable<ClaimDto>> GetPendingAsync()
        {
            return await _context.Claims
                .Where(c => c.Status == ClaimStatus.Submitted)
                .Include(c => c.CustomerPolicy)
                    .ThenInclude(cp => cp.Customer)
                .Include(c => c.Hospital)
                .Select(c => new ClaimDto
                {
                    Id = c.Id,
                    ClaimNumber = c.ClaimNumber,
                    ClaimAmount = c.ClaimAmount,
                    TreatmentDetails = c.TreatmentDetails,
                    TreatmentDate = c.TreatmentDate,
                    SubmissionDate = c.SubmissionDate,
                    Status = c.Status,
                    CustomerName = $"{c.CustomerPolicy.Customer.FirstName} {c.CustomerPolicy.Customer.LastName}",
                    HospitalName = c.Hospital.Name
                })
                .ToListAsync();
        }

        public async Task<IEnumerable<ClaimDto>> GetAllClaimsAsync()
        {
            return await _context.Claims
                .Include(c => c.CustomerPolicy)
                    .ThenInclude(cp => cp.Customer)
                .Include(c => c.Hospital)
                .Include(c => c.ClaimOfficer)
                .Select(c => new ClaimDto
                {
                    Id = c.Id,
                    ClaimNumber = c.ClaimNumber,
                    ClaimAmount = c.ClaimAmount,
                    TreatmentDetails = c.TreatmentDetails,
                    TreatmentDate = c.TreatmentDate,
                    SubmissionDate = c.SubmissionDate,
                    Status = c.Status,
                    RejectionReason = c.RejectionReason,
                    ApprovedAmount = c.ApprovedAmount,
                    ProcessedDate = c.ProcessedDate,
                    CustomerName = $"{c.CustomerPolicy.Customer.FirstName} {c.CustomerPolicy.Customer.LastName}",
                    HospitalName = c.Hospital.Name,
                    ClaimOfficerName = c.ClaimOfficer != null ? $"{c.ClaimOfficer.FirstName} {c.ClaimOfficer.LastName}" : "Unassigned"
                })
                .ToListAsync();
        }
        

        public new async Task<int> GetCountAsync()
        {
            return await _dbSet.CountAsync();
        }

        public async Task<int> GetCountByStatusAsync(ClaimStatus status)
        {
            return await _dbSet.CountAsync(c => c.Status == status);
        }

        public async Task<Claim?> GetByIdWithIncludesAsync(int id)
        {
            return await _context.Claims
                .Include(c => c.CustomerPolicy)
                    .ThenInclude(cp => cp.Customer)
                .Include(c => c.CustomerPolicy)
                    .ThenInclude(cp => cp.Policy)
                .Include(c => c.Hospital)
                .Include(c => c.ClaimOfficer)
                .FirstOrDefaultAsync(c => c.Id == id);
        }

        public async Task<IEnumerable<Claim>> GetByClaimOfficerIdAsync(int claimOfficerId)
        {
            return await _context.Claims
                .Where(c => c.ClaimOfficerId == claimOfficerId)
                .Include(c => c.CustomerPolicy)
                    .ThenInclude(cp => cp.Customer)
                .Include(c => c.Hospital)
                .Include(c => c.ClaimOfficer)
                .ToListAsync();
        }

        public async Task<IEnumerable<ClaimDto>> GetClaimsByOfficerIdAsync(int claimOfficerId)
        {
            return await _context.Claims
                .Where(c => c.ClaimOfficerId == claimOfficerId)
                .Include(c => c.CustomerPolicy)
                    .ThenInclude(cp => cp.Customer)
                .Include(c => c.Hospital)
                .Include(c => c.ClaimOfficer)
                .Select(c => new ClaimDto
                {
                    Id = c.Id,
                    ClaimNumber = c.ClaimNumber,
                    ClaimAmount = c.ClaimAmount,
                    TreatmentDetails = c.TreatmentDetails,
                    TreatmentDate = c.TreatmentDate,
                    SubmissionDate = c.SubmissionDate,
                    Status = c.Status,
                    RejectionReason = c.RejectionReason,
                    ApprovedAmount = c.ApprovedAmount,
                    ProcessedDate = c.ProcessedDate,
                    CustomerName = $"{c.CustomerPolicy.Customer.FirstName} {c.CustomerPolicy.Customer.LastName}",
                    HospitalName = c.Hospital.Name
                })
                .ToListAsync();
        }

        public async Task<IEnumerable<ClaimDto>> GetPendingClaimsByOfficerIdAsync(int claimOfficerId)
        {
            return await _context.Claims
                .Where(c => c.ClaimOfficerId == claimOfficerId && 
                           (c.Status == ClaimStatus.Submitted || 
                            c.Status == ClaimStatus.UnderReview || 
                            c.Status == ClaimStatus.DocumentsRequested))
                .Include(c => c.CustomerPolicy)
                    .ThenInclude(cp => cp.Customer)
                .Include(c => c.Hospital)
                .Select(c => new ClaimDto
                {
                    Id = c.Id,
                    ClaimNumber = c.ClaimNumber,
                    ClaimAmount = c.ClaimAmount,
                    TreatmentDetails = c.TreatmentDetails,
                    TreatmentDate = c.TreatmentDate,
                    SubmissionDate = c.SubmissionDate,
                    Status = c.Status,
                    CustomerName = $"{c.CustomerPolicy.Customer.FirstName} {c.CustomerPolicy.Customer.LastName}",
                    HospitalName = c.Hospital.Name
                })
                .ToListAsync();
        }

        public async Task<IEnumerable<ClaimDto>> GetUnassignedPendingAsync()
        {
            return await _context.Claims
                .Where(c => (c.Status == ClaimStatus.Submitted || 
                            c.Status == ClaimStatus.UnderReview || 
                            c.Status == ClaimStatus.DocumentsRequested) && 
                            c.ClaimOfficerId == null)
                .Include(c => c.CustomerPolicy)
                    .ThenInclude(cp => cp.Customer)
                .Include(c => c.Hospital)
                .Select(c => new ClaimDto
                {
                    Id = c.Id,
                    ClaimNumber = c.ClaimNumber,
                    ClaimAmount = c.ClaimAmount,
                    TreatmentDetails = c.TreatmentDetails,
                    TreatmentDate = c.TreatmentDate,
                    SubmissionDate = c.SubmissionDate,
                    Status = c.Status,
                    CustomerName = $"{c.CustomerPolicy.Customer.FirstName} {c.CustomerPolicy.Customer.LastName}",
                    HospitalName = c.Hospital.Name
                })
                .ToListAsync();
        }
    }
}