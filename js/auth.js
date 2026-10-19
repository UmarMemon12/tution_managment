/**
 * Tuition Management System - Authentication & Role-Based Authorization
 */

// Demo credentials for quick testing without backend
const DEMO_USERS = {
  admin: {
    id: 'demo-admin-uuid',
    email: 'admin@apexacademy.edu',
    full_name: 'Super Administrator',
    role: 'admin',
    avatar_url: null
  },
  teacher: {
    id: 'demo-teacher-uuid',
    email: 'rajesh.sharma@apexacademy.edu',
    full_name: 'Dr. Rajesh Sharma',
    role: 'teacher',
    teacher_id: '11111111-1111-1111-1111-111111111101',
    avatar_url: null
  },
  receptionist: {
    id: 'demo-reception-uuid',
    email: 'reception@apexacademy.edu',
    full_name: 'Pooja Verma (Reception)',
    role: 'receptionist',
    avatar_url: null
  }
};

let currentUser = null;
let currentProfile = null;

/**
 * Initialize Authentication on page load
 */
async function initAuth(allowedRoles = []) {
  const isLoginPage = window.location.pathname.endsWith('login.html');

  // Check for active demo session first
  const demoRole = sessionStorage.getItem('TMS_DEMO_ROLE');
  if (demoRole && DEMO_USERS[demoRole]) {
    currentProfile = DEMO_USERS[demoRole];
    currentUser = { id: currentProfile.id, email: currentProfile.email };
    if (isLoginPage) {
      window.location.href = 'dashboard.html';
      return;
    }
    updateUserUI();
    enforceRoleAccess(allowedRoles);
    return;
  }

  // Check Supabase session
  if (window.supabaseClient && window.isSupabaseConfigured) {
    try {
      const { data: { session }, error } = await window.supabaseClient.auth.getSession();
      if (error) throw error;

      if (!session) {
        if (!isLoginPage) {
          window.location.href = 'login.html';
        }
        return;
      }

      currentUser = session.user;
      await fetchUserProfile(currentUser.id);

      if (isLoginPage) {
        window.location.href = 'dashboard.html';
        return;
      }

      updateUserUI();
      enforceRoleAccess(allowedRoles);
      return;
    } catch (err) {
      console.error("Auth check error:", err);
      if (!isLoginPage) {
        window.location.href = 'login.html';
      }
      return;
    }
  }

  // If Supabase is not configured and not on login page, redirect to login
  if (!isLoginPage) {
    window.location.href = 'login.html';
  }
}

/**
 * Fetch profile details and role from public.profiles
 */
async function fetchUserProfile(userId) {
  try {
    const { data, error } = await window.supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.warn("Could not load user profile:", error.message);
      // Fallback profile if row does not exist yet
      currentProfile = {
        id: userId,
        email: currentUser.email,
        full_name: currentUser.email.split('@')[0],
        role: 'receptionist'
      };
    } else {
      currentProfile = data;
    }
  } catch (err) {
    console.error("Error fetching profile:", err);
  }
}

/**
 * Log in with Email and Password
 */
async function loginUser(email, password) {
  if (!window.supabaseClient || !window.isSupabaseConfigured) {
    throw new Error("Supabase is not configured yet. Please configure credentials or use Quick Demo Login.");
  }

  const { data, error } = await window.supabaseClient.auth.signInWithPassword({
    email: email.trim(),
    password: password
  });

  if (error) throw error;
  return data;
}

/**
 * Demo Login Helper (for testing roles instantly)
 */
function loginAsDemo(role = 'admin') {
  if (DEMO_USERS[role]) {
    sessionStorage.setItem('TMS_DEMO_ROLE', role);
    window.location.href = 'dashboard.html';
  }
}

/**
 * Log out
 */
async function logoutUser() {
  sessionStorage.removeItem('TMS_DEMO_ROLE');
  if (window.supabaseClient) {
    try {
      await window.supabaseClient.auth.signOut();
    } catch (e) {
      console.warn("SignOut notice:", e);
    }
  }
  window.location.href = 'login.html';
}

/**
 * Enforce role-based access restrictions on specific pages
 */
function enforceRoleAccess(allowedRoles = []) {
  if (!allowedRoles || allowedRoles.length === 0) return;

  const userRole = currentProfile ? currentProfile.role : 'receptionist';

  if (!allowedRoles.includes(userRole)) {
    alert(`Access Denied: Your account role (${userRole.toUpperCase()}) does not have permission to view this section.`);
    window.location.href = 'dashboard.html';
  }
}

/**
 * Update UI elements to reflect the current user's profile and permissions
 */
function updateUserUI() {
  if (!currentProfile) return;

  const role = currentProfile.role || 'receptionist';
  const name = currentProfile.full_name || 'Staff User';

  // Update user badge in topbar and sidebar
  const nameEls = document.querySelectorAll('.user-display-name');
  nameEls.forEach(el => el.textContent = name);

  const roleEls = document.querySelectorAll('.user-role-badge');
  roleEls.forEach(el => {
    el.textContent = role.toUpperCase();
    el.className = `role-pill role-${role} user-role-badge`;
  });

  const avatarEls = document.querySelectorAll('.user-avatar-initials');
  const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  avatarEls.forEach(el => el.textContent = initials || 'U');

  // Role-based navigation visibility
  if (role === 'teacher') {
    // Teachers do not have access to fee management
    const feesNav = document.querySelector('[data-nav="fees"]');
    if (feesNav) feesNav.style.display = 'none';

    // Hide teacher management from regular teachers
    const teachersNav = document.querySelector('[data-nav="teachers"]');
    if (teachersNav) teachersNav.style.display = 'none';
  }

  // Bind logout buttons
  const logoutButtons = document.querySelectorAll('.logout-trigger');
  logoutButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      confirmDialog('Sign Out', 'Are you sure you want to log out of your session?', 'Log Out', true)
        .then(confirmed => {
          if (confirmed) logoutUser();
        });
    });
  });
}

// Global Auth Helpers
window.getCurrentUser = () => currentUser;
window.getCurrentProfile = () => currentProfile;
window.isAdmin = () => currentProfile && currentProfile.role === 'admin';
window.isTeacher = () => currentProfile && currentProfile.role === 'teacher';
window.isReceptionist = () => currentProfile && (currentProfile.role === 'admin' || currentProfile.role === 'receptionist');
