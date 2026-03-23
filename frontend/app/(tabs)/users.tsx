import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '../../src/api/client';
import { useAuthStore } from '../../src/store/authStore';
import { Colors } from '../../src/constants/theme';

interface User {
  user: string;
  role?: string;
  source?: string;
  status?: string;
}

interface ViewerUser {
  user: string;
  status?: string;
}

export default function UsersScreen() {
  const { user: currentUser, userType } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [viewerUsers, setViewerUsers] = useState<ViewerUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dispatchers' | 'viewers'>('dispatchers');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createType, setCreateType] = useState<'dispatcher' | 'viewer'>('dispatcher');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('dispatcher');
  const [isCreating, setIsCreating] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      const [usersRes, viewersRes] = await Promise.all([
        apiClient.get('/api/admin/users'),
        apiClient.get('/api/admin/viewer-users'),
      ]);
      
      if (usersRes.data) setUsers(usersRes.data);
      if (viewersRes.data) setViewerUsers(viewersRes.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (userType === 'admin') {
      fetchUsers();
    }
  }, [userType, fetchUsers]);

  const handleCreateUser = async () => {
    if (!newUsername.trim() || !newPassword.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setIsCreating(true);
    try {
      const endpoint = createType === 'dispatcher' 
        ? '/api/admin/users' 
        : '/api/admin/viewer-users';
      
      const payload = createType === 'dispatcher'
        ? { user: newUsername.trim(), pass: newPassword, role: newRole }
        : { user: newUsername.trim(), pass: newPassword };

      await apiClient.post(endpoint, payload);
      
      Alert.alert('Success', `${createType === 'dispatcher' ? 'Dispatcher' : 'Viewer'} created successfully`);
      setShowCreateModal(false);
      setNewUsername('');
      setNewPassword('');
      setNewRole('dispatcher');
      fetchUsers();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to create user');
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleStatus = async (username: string, currentStatus: string, isViewer: boolean) => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    const endpoint = isViewer 
      ? `/api/admin/viewer-users/${username}/status`
      : `/api/admin/users/${username}/status`;

    try {
      await apiClient.put(endpoint, { status: newStatus });
      fetchUsers();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to update status');
    }
  };

  const handleResetPassword = async (username: string, isViewer: boolean) => {
    Alert.prompt(
      'Reset Password',
      `Enter new password for ${username}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          onPress: async (newPass) => {
            if (!newPass || newPass.length < 4) {
              Alert.alert('Error', 'Password must be at least 4 characters');
              return;
            }
            try {
              const endpoint = isViewer
                ? `/api/admin/viewer-users/${username}/password`
                : `/api/admin/users/${username}/password`;
              await apiClient.put(endpoint, { pass: newPass });
              Alert.alert('Success', 'Password reset successfully');
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.error || 'Failed to reset password');
            }
          },
        },
      ],
      'secure-text'
    );
  };

  const renderUser = ({ item }: { item: User | ViewerUser }) => {
    const isViewer = activeTab === 'viewers';
    const status = item.status || 'active';
    const isActive = status === 'active';
    const role = 'role' in item ? item.role : 'viewer';
    const source = 'source' in item ? item.source : undefined;

    return (
      <View style={styles.userCard}>
        <View style={styles.userInfo}>
          <View style={styles.userHeader}>
            <View style={[styles.userAvatar, { backgroundColor: isViewer ? Colors.dark.accent + '20' : Colors.dark.success + '20' }]}>
              <Ionicons 
                name={isViewer ? 'eye' : 'shield'} 
                size={18} 
                color={isViewer ? Colors.dark.accent : Colors.dark.success} 
              />
            </View>
            <View style={styles.userDetails}>
              <Text style={styles.userName}>{item.user}</Text>
              <View style={styles.userMeta}>
                {role && (
                  <View style={[styles.roleBadge, { backgroundColor: getRoleColor(role) + '20' }]}>
                    <Text style={[styles.roleText, { color: getRoleColor(role) }]}>
                      {role.toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={[styles.statusBadge, { backgroundColor: isActive ? Colors.dark.success + '20' : Colors.dark.error + '20' }]}>
                  <View style={[styles.statusDot, { backgroundColor: isActive ? Colors.dark.success : Colors.dark.error }]} />
                  <Text style={[styles.statusText, { color: isActive ? Colors.dark.success : Colors.dark.error }]}>
                    {status.toUpperCase()}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>
        
        {source !== 'env' && (
          <View style={styles.userActions}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => handleToggleStatus(item.user, status, isViewer)}
            >
              <Ionicons 
                name={isActive ? 'pause-circle-outline' : 'play-circle-outline'} 
                size={22} 
                color={isActive ? Colors.dark.warning : Colors.dark.success} 
              />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => handleResetPassword(item.user, isViewer)}
            >
              <Ionicons name="key-outline" size={20} color={Colors.dark.textSecondary} />
            </TouchableOpacity>
          </View>
        )}
        {source === 'env' && (
          <View style={styles.envBadge}>
            <Text style={styles.envText}>ENV</Text>
          </View>
        )}
      </View>
    );
  };

  if (userType !== 'admin') {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>User Management</Text>
        </View>
        <View style={styles.restrictedContainer}>
          <Ionicons name="lock-closed" size={64} color={Colors.dark.textMuted} />
          <Text style={styles.restrictedTitle}>Admin Access Only</Text>
          <Text style={styles.restrictedSubtitle}>
            User management is only available for administrators
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>User Management</Text>
          <Text style={styles.headerSubtitle}>
            {users.length + viewerUsers.length} total accounts
          </Text>
        </View>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => setShowCreateModal(true)}
        >
          <Ionicons name="person-add" size={22} color={Colors.dark.text} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'dispatchers' && styles.tabActive]}
          onPress={() => setActiveTab('dispatchers')}
        >
          <Ionicons 
            name="shield" 
            size={18} 
            color={activeTab === 'dispatchers' ? Colors.dark.accent : Colors.dark.textSecondary} 
          />
          <Text style={[styles.tabText, activeTab === 'dispatchers' && styles.tabTextActive]}>
            Dispatchers ({users.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'viewers' && styles.tabActive]}
          onPress={() => setActiveTab('viewers')}
        >
          <Ionicons 
            name="eye" 
            size={18} 
            color={activeTab === 'viewers' ? Colors.dark.accent : Colors.dark.textSecondary} 
          />
          <Text style={[styles.tabText, activeTab === 'viewers' && styles.tabTextActive]}>
            Viewers ({viewerUsers.length})
          </Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.dark.accent} />
        </View>
      ) : (
        <FlatList
          data={activeTab === 'dispatchers' ? users : viewerUsers}
          keyExtractor={(item) => item.user}
          renderItem={renderUser}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={48} color={Colors.dark.textMuted} />
              <Text style={styles.emptyText}>No {activeTab} found</Text>
            </View>
          }
        />
      )}

      {/* Create User Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create New Account</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Ionicons name="close" size={24} color={Colors.dark.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Account Type */}
              <Text style={styles.inputLabel}>Account Type</Text>
              <View style={styles.typeSelector}>
                <TouchableOpacity
                  style={[styles.typeButton, createType === 'dispatcher' && styles.typeButtonActive]}
                  onPress={() => setCreateType('dispatcher')}
                >
                  <Ionicons 
                    name="shield" 
                    size={18} 
                    color={createType === 'dispatcher' ? Colors.dark.text : Colors.dark.textSecondary} 
                  />
                  <Text style={[styles.typeButtonText, createType === 'dispatcher' && styles.typeButtonTextActive]}>
                    Dispatcher
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.typeButton, createType === 'viewer' && styles.typeButtonActive]}
                  onPress={() => setCreateType('viewer')}
                >
                  <Ionicons 
                    name="eye" 
                    size={18} 
                    color={createType === 'viewer' ? Colors.dark.text : Colors.dark.textSecondary} 
                  />
                  <Text style={[styles.typeButtonText, createType === 'viewer' && styles.typeButtonTextActive]}>
                    Viewer
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Username */}
              <Text style={styles.inputLabel}>Username</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Enter username"
                placeholderTextColor={Colors.dark.textMuted}
                value={newUsername}
                onChangeText={setNewUsername}
                autoCapitalize="none"
              />

              {/* Password */}
              <Text style={styles.inputLabel}>Password</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Enter password"
                placeholderTextColor={Colors.dark.textMuted}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
              />

              {/* Role (for dispatchers only) */}
              {createType === 'dispatcher' && (
                <>
                  <Text style={styles.inputLabel}>Role</Text>
                  <View style={styles.roleSelector}>
                    {['dispatcher', 'admin', 'owner'].map((role) => (
                      <TouchableOpacity
                        key={role}
                        style={[styles.roleButton, newRole === role && styles.roleButtonActive]}
                        onPress={() => setNewRole(role)}
                      >
                        <Text style={[styles.roleButtonText, newRole === role && styles.roleButtonTextActive]}>
                          {role.charAt(0).toUpperCase() + role.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}
            </ScrollView>

            <TouchableOpacity
              style={[styles.createButton, isCreating && styles.createButtonDisabled]}
              onPress={handleCreateUser}
              disabled={isCreating}
            >
              {isCreating ? (
                <ActivityIndicator color={Colors.dark.text} />
              ) : (
                <>
                  <Ionicons name="person-add" size={20} color={Colors.dark.text} />
                  <Text style={styles.createButtonText}>Create Account</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function getRoleColor(role: string): string {
  switch (role?.toLowerCase()) {
    case 'owner':
      return Colors.dark.warning;
    case 'admin':
      return Colors.dark.error;
    case 'dispatcher':
      return Colors.dark.success;
    default:
      return Colors.dark.accent;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.dark.text,
  },
  headerSubtitle: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
    marginTop: 2,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.dark.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabs: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.dark.surface,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    gap: 6,
  },
  tabActive: {
    backgroundColor: Colors.dark.accent + '20',
    borderColor: Colors.dark.accent,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.dark.textSecondary,
  },
  tabTextActive: {
    color: Colors.dark.accent,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  userInfo: {
    flex: 1,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.dark.text,
    marginBottom: 4,
  },
  userMeta: {
    flexDirection: 'row',
    gap: 6,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  roleText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  userActions: {
    flexDirection: 'row',
    gap: 4,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.dark.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  envBadge: {
    backgroundColor: Colors.dark.surfaceLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  envText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.dark.textMuted,
    letterSpacing: 0.5,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.dark.textSecondary,
    marginTop: 12,
  },
  restrictedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  restrictedTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.dark.text,
    marginTop: 16,
  },
  restrictedSubtitle: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.dark.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.dark.text,
  },
  modalBody: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.dark.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modalInput: {
    backgroundColor: Colors.dark.surfaceLight,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: Colors.dark.text,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: Colors.dark.surfaceLight,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    gap: 6,
  },
  typeButtonActive: {
    backgroundColor: Colors.dark.accent,
    borderColor: Colors.dark.accent,
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.dark.textSecondary,
  },
  typeButtonTextActive: {
    color: Colors.dark.text,
  },
  roleSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  roleButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: Colors.dark.surfaceLight,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    alignItems: 'center',
  },
  roleButtonActive: {
    backgroundColor: Colors.dark.accent + '20',
    borderColor: Colors.dark.accent,
  },
  roleButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.dark.textSecondary,
  },
  roleButtonTextActive: {
    color: Colors.dark.accent,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.dark.accent,
    marginHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  createButtonDisabled: {
    opacity: 0.7,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark.text,
  },
});
