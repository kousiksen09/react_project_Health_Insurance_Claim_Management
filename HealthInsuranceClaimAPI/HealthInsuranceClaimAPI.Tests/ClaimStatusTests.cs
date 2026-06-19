using HealthInsuranceClaimAPI.Enums;
using Xunit;

namespace HealthInsuranceClaimAPI.Tests;

public class ClaimStatusTests
{
    [Fact]
    public void ClaimStatus_HasExpectedWorkflowOrder()
    {
        Assert.Equal(1, (int)ClaimStatus.Submitted);
        Assert.Equal(6, (int)ClaimStatus.Paid);
    }

    [Theory]
    [InlineData(ClaimStatus.Submitted)]
    [InlineData(ClaimStatus.UnderReview)]
    [InlineData(ClaimStatus.Approved)]
    public void ClaimStatus_IsDefined(ClaimStatus status)
    {
        Assert.True(Enum.IsDefined(status));
    }
}
