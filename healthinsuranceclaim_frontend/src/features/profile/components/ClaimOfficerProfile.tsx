import { useState } from 'react';
import { Box, Paper, Typography, Grid, TextField, Avatar, Alert, Button, CircularProgress } from '@mui/material';
import { Badge, Edit, Save, Cancel, PhotoCamera, ArrowBack } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { useProfile } from '../../../shared/hooks/useProfile';
import { profileApi } from '../../../shared/services/profileApi';
import { USER_ROLE_LABELS, API_BASE_URL } from '../../../shared/utils/constants';

export const ClaimOfficerProfile = () => {
  const { profile, loading, error, refreshProfile } = useProfile();
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    profileImage: undefined as File | undefined
  });
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  if (loading) return <Typography>Loading profile...</Typography>;
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!profile) return <Alert severity="warning">Profile not found</Alert>;

  const handleEdit = () => {
    setFormData({
      firstName: profile.firstName || '',
      lastName: profile.lastName || '',
      profileImage: undefined
    });
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        setSaving(true);
        const imageData = { firstName: profile.firstName || '', lastName: profile.lastName || '', profileImage: file };
        await profileApi.updateClaimOfficerProfile(imageData);
        enqueueSnackbar('Profile image updated successfully!', { variant: 'success' });
        refreshProfile();
      } catch (error) {
        enqueueSnackbar('Failed to update profile image', { variant: 'error' });
      } finally {
        setSaving(false);
      }
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await profileApi.updateClaimOfficerProfile(formData);
      enqueueSnackbar('Profile updated successfully!', { variant: 'success' });
      setIsEditing(false);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
      refreshProfile();
    } catch (error) {
      enqueueSnackbar('Failed to update profile', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button 
            startIcon={<ArrowBack />} 
            variant="outlined" 
            onClick={() => navigate(-1)}
            sx={{ minWidth: 'auto' }}
          >
            Back
          </Button>
          <Typography variant="h4">My Profile</Typography>
        </Box>
        {!isEditing ? (
          <Button startIcon={<Edit />} variant="outlined" onClick={handleEdit}>
            Edit Profile
          </Button>
        ) : (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button 
              startIcon={<Save />} 
              variant="contained" 
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? <CircularProgress size={20} /> : 'Save'}
            </Button>
            <Button 
              startIcon={<Cancel />} 
              variant="outlined" 
              onClick={handleCancel}
              disabled={saving}
            >
              Cancel
            </Button>
          </Box>
        )}
      </Box>
      
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Box sx={{ position: 'relative' }}>
            <Avatar 
              sx={{ mr: 2, bgcolor: 'primary.main', width: 56, height: 56 }}
              src={previewUrl || (profile.profileImageUrl ? `${API_BASE_URL}${profile.profileImageUrl}` : undefined)}
            >
              {!previewUrl && !profile.profileImageUrl && <Badge />}
            </Avatar>
            <Button
              component="label"
              sx={{
                position: 'absolute',
                bottom: -5,
                right: 10,
                minWidth: 'auto',
                width: 24,
                height: 24,
                borderRadius: '50%',
                bgcolor: 'primary.main',
                '&:hover': { bgcolor: 'primary.dark' }
              }}
              disabled={saving}
            >
              <PhotoCamera sx={{ fontSize: 12, color: 'white' }} />
              <input
                type="file"
                hidden
                accept="image/*"
                onChange={handleImageUpload}
              />
            </Button>
          </Box>
          <Box>
            <Typography variant="h5">
              {isEditing ? `${formData.firstName} ${formData.lastName}` : `${profile.firstName || 'N/A'} ${profile.lastName || 'N/A'}`}
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              {USER_ROLE_LABELS[profile.role as keyof typeof USER_ROLE_LABELS] || 'Unknown Role'}
            </Typography>
          </Box>
        </Box>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="First Name"
              value={isEditing ? formData.firstName : (profile.firstName || '')}
              onChange={(e) => handleInputChange('firstName', e.target.value)}
              InputProps={{ readOnly: !isEditing }}
              variant="outlined"
              required={isEditing}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Last Name"
              value={isEditing ? formData.lastName : (profile.lastName || '')}
              onChange={(e) => handleInputChange('lastName', e.target.value)}
              InputProps={{ readOnly: !isEditing }}
              variant="outlined"
              required={isEditing}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Email"
              value={profile.email || ''}
              InputProps={{ readOnly: true }}
              variant="filled"
              sx={{ 
                '& .MuiFilledInput-root': { 
                  backgroundColor: 'grey.100',
                  '&:hover': { backgroundColor: 'grey.100' },
                  '&.Mui-focused': { backgroundColor: 'grey.100' }
                }
              }}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Role"
              value={USER_ROLE_LABELS[profile.role as keyof typeof USER_ROLE_LABELS] || 'Unknown Role'}
              InputProps={{ readOnly: true }}
              variant="filled"
              sx={{ 
                '& .MuiFilledInput-root': { 
                  backgroundColor: 'grey.100',
                  '&:hover': { backgroundColor: 'grey.100' },
                  '&.Mui-focused': { backgroundColor: 'grey.100' }
                }
              }}
            />
          </Grid>

        </Grid>
      </Paper>
    </Box>
  );
};