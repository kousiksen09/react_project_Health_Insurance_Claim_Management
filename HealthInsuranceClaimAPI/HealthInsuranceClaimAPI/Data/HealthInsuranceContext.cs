using Microsoft.EntityFrameworkCore;
using HealthInsuranceClaimAPI.Models;
using HealthInsuranceClaimAPI.Enums;
using System.Security.Cryptography;
using System.Text;

namespace HealthInsuranceClaimAPI.Data
{
    public class HealthInsuranceContext : DbContext
    {
        public HealthInsuranceContext(DbContextOptions<HealthInsuranceContext> options) : base(options) { }

        public DbSet<User> Users { get; set; }
        public DbSet<Customer> Customers { get; set; }
        public DbSet<Hospital> Hospitals { get; set; }
        public DbSet<ClaimOfficer> ClaimOfficers { get; set; }
        public DbSet<Policy> Policies { get; set; }
        public DbSet<CustomerPolicy> CustomerPolicies { get; set; }
        public DbSet<Claim> Claims { get; set; }
        public DbSet<ClaimDocument> ClaimDocuments { get; set; }
        public DbSet<PaymentTransaction> PaymentTransactions { get; set; }
        public DbSet<Notification> Notifications { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            
            modelBuilder.Entity<User>()
                .HasOne(u => u.Customer)
                .WithOne(c => c.User)
                .HasForeignKey<Customer>(c => c.UserId);

            modelBuilder.Entity<User>()
                .HasOne(u => u.Hospital)
                .WithOne(h => h.User)
                .HasForeignKey<Hospital>(h => h.UserId);

            modelBuilder.Entity<User>()
                .HasOne(u => u.ClaimOfficer)
                .WithOne(co => co.User)
                .HasForeignKey<ClaimOfficer>(co => co.UserId);

            modelBuilder.Entity<CustomerPolicy>()
                .HasOne(cp => cp.Customer)
                .WithMany(c => c.CustomerPolicies)
                .HasForeignKey(cp => cp.CustomerId);

            modelBuilder.Entity<CustomerPolicy>()
                .HasOne(cp => cp.Policy)
                .WithMany(p => p.CustomerPolicies)
                .HasForeignKey(cp => cp.PolicyId);

            modelBuilder.Entity<Claim>()
                .HasOne(c => c.CustomerPolicy)
                .WithMany(cp => cp.Claims)
                .HasForeignKey(c => c.CustomerPolicyId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Claim>()
                .HasOne(c => c.Hospital)
                .WithMany(h => h.Claims)
                .HasForeignKey(c => c.HospitalId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Claim>()
                .HasOne(c => c.ClaimOfficer)
                .WithMany(co => co.Claims)
                .HasForeignKey(c => c.ClaimOfficerId)
                .OnDelete(DeleteBehavior.SetNull);

            modelBuilder.Entity<Policy>()
                .Property(p => p.Premium)
                .HasPrecision(18, 2);

            modelBuilder.Entity<Policy>()
                .Property(p => p.CoverageAmount)
                .HasPrecision(18, 2);

            modelBuilder.Entity<Claim>()
                .Property(c => c.ClaimAmount)
                .HasPrecision(18, 2);

            modelBuilder.Entity<Claim>()
                .Property(c => c.ApprovedAmount)
                .HasPrecision(18, 2);

            modelBuilder.Entity<PaymentTransaction>()
                .Property(pt => pt.Amount)
                .HasPrecision(18, 2);

            modelBuilder.Entity<User>()
                .HasIndex(u => u.Email)
                .IsUnique();

            modelBuilder.Entity<Customer>()
                .HasIndex(c => c.CustomerNumber)
                .IsUnique();

            modelBuilder.Entity<Hospital>()
                .HasIndex(h => h.LicenseNumber)
                .IsUnique();

            modelBuilder.Entity<Claim>()
                .HasIndex(c => c.ClaimNumber)
                .IsUnique();

            modelBuilder.Entity<User>().HasData(
                new User
                {
                    Id = 1,
                    Email = "kousik.sen@pwc.com",
                    PasswordHash = "240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9", 
                    Role = UserRole.Admin,
                    FirstName = "Admin",
                    LastName = "User",
                    ProfileImageUrl = null,
                    IsActive = true,
                    CreatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc)
                }
            );

            modelBuilder.Entity<Policy>().HasData(
                new Policy
                {
                    Id = 1,
                    PolicyNumber = "POL1",
                    Name = "Basic Health Plan",
                    Description = "Basic health coverage for individuals",
                    Premium = 2000,
                    CoverageAmount = 200000,
                    DurationMonths = 12,
                    PolicyType = PolicyType.Individual,
                    IsActive = true,
                    CreatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc)
                },
                new Policy
                {
                    Id = 2,
                    PolicyNumber = "POL2",
                    Name = "Family Health Plan",
                    Description = "Comprehensive health coverage for families",
                    Premium = 5000,
                    CoverageAmount = 500000,
                    DurationMonths = 12,
                    PolicyType = PolicyType.Family,
                    IsActive = true,
                    CreatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc)
                },
                new Policy
                {
                    Id = 3,
                    PolicyNumber = "POL3",
                    Name = "Senior Citizen Plan",
                    Description = "Specialized health coverage for senior citizens",
                    Premium = 3000,
                    CoverageAmount = 300000,
                    DurationMonths = 12,
                    PolicyType = PolicyType.Senior,
                    IsActive = true,
                    CreatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc)
                }
            );

            base.OnModelCreating(modelBuilder);
        }
    }
}