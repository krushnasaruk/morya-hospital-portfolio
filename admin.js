/* ==========================================================================
   DOCTOR PORTAL ADMIN CONTROL JAVASCRIPT
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
    
    // Auth & Overlay elements
    const loginOverlay = document.getElementById("login-overlay");
    const loginForm = document.getElementById("login-form");
    const loginError = document.getElementById("login-error");
    const logoutBtn = document.getElementById("logout-btn");
    
    // Tab & Table elements
    const tabButtons = document.querySelectorAll(".tab-btn");
    const appointmentsTable = document.getElementById("appointments-table");
    const enquiriesTable = document.getElementById("enquiries-table");
    const appointmentsTbody = document.getElementById("appointments-tbody");
    const enquiriesTbody = document.getElementById("enquiries-tbody");
    
    // Loading & Empty indicators
    const loadingState = document.getElementById("table-loading-state");
    const emptyState = document.getElementById("table-empty-state");
    
    // Metrics elements
    const revenueMetric = document.getElementById("metric-revenue");
    const appointmentsMetric = document.getElementById("metric-appointments");
    const enquiriesMetric = document.getElementById("metric-enquiries");
    
    // Filter controls
    const searchFilter = document.getElementById("filter-search");
    const doctorFilter = document.getElementById("filter-doctor");
    const dateFilter = document.getElementById("filter-date");
    const clearFiltersBtn = document.getElementById("clear-filters-btn");
    const doctorFilterWrapper = document.getElementById("doctor-filter-wrapper");
    
    // Local data store
    let appointmentsData = [];
    let enquiriesData = [];
    let currentTab = "appointments"; // or "enquiries"

    /* ==========================================
       1. AUTHENTICATION & LOGIN FLOW
       ========================================== */
    const getAuthToken = () => localStorage.getItem("admin_token");

    const checkAuthentication = async () => {
        const token = getAuthToken();
        if (!token) {
            showLoginOverlay();
            return;
        }

        showLoading();
        try {
            // Test auth by fetching appointments
            const res = await fetch("/api/admin/appointments", {
                headers: { "Authorization": `Bearer ${token}` }
            });

            if (res.status === 401) {
                // Token invalid or expired
                localStorage.removeItem("admin_token");
                showLoginOverlay();
                return;
            }

            if (!res.ok) throw new Error("Could not authenticate.");

            // Authenticated successfully - Hide login and fetch full details
            loginOverlay.classList.add("hidden");
            await loadDashboardData();
        } catch (err) {
            console.error(err);
            showLoginOverlay();
        }
    };

    const showLoginOverlay = () => {
        loginOverlay.classList.remove("hidden");
        hideLoading();
        hideEmptyState();
    };

    // Form login submission
    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        loginError.style.display = "none";
        
        const usernameInput = document.getElementById("username").value.trim();
        const passwordInput = document.getElementById("password").value.trim();
        
        const loginBtn = loginForm.querySelector(".btn-login");
        const btnText = loginBtn.querySelector(".btn-text");
        const originalText = btnText.textContent;
        
        btnText.textContent = "VERIFYING SECURE KEY...";
        loginBtn.disabled = true;

        try {
            const res = await fetch("/api/admin/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username: usernameInput, password: passwordInput })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Authentication failed.");
            }

            // Save token
            localStorage.setItem("admin_token", data.token);
            loginOverlay.classList.add("hidden");
            
            // Reset fields
            loginForm.reset();
            
            // Load dashboard
            await loadDashboardData();
        } catch (err) {
            loginError.textContent = err.message || "Invalid credentials.";
            loginError.style.display = "block";
        } finally {
            btnText.textContent = originalText;
            loginBtn.disabled = false;
        }
    });

    // Logout
    logoutBtn.addEventListener("click", () => {
        if (confirm("Are you sure you want to log out of the doctor portal?")) {
            localStorage.removeItem("admin_token");
            window.location.reload();
        }
    });

    /* ==========================================
       2. DATABASE LOAD & CALCULATIONS
       ========================================== */
    const loadDashboardData = async () => {
        showLoading();
        const token = getAuthToken();

        try {
            // Fetch appointments
            const apptRes = await fetch("/api/admin/appointments", {
                headers: { "Authorization": `Bearer ${token}` }
            });
            const apptData = await apptRes.json();
            appointmentsData = apptData.appointments || [];

            // Fetch enquiries
            const enqRes = await fetch("/api/admin/enquiries", {
                headers: { "Authorization": `Bearer ${token}` }
            });
            const enqData = await enqRes.json();
            enquiriesData = enqData.enquiries || [];

            // Calculate & populate metrics
            calculateMetrics();
            
            // Render lists
            renderLists();
        } catch (err) {
            console.error("Dashboard load failed:", err);
            alert("Error loading portal database. Please reload.");
        } finally {
            hideLoading();
        }
    };

    const calculateMetrics = () => {
        const confirmedCount = appointmentsData.length;
        const enquiriesCount = enquiriesData.length;
        
        // Fee configuration (defaults to Rs 250)
        const revenue = confirmedCount * 250;

        appointmentsMetric.textContent = confirmedCount;
        enquiriesMetric.textContent = enquiriesCount;
        revenueMetric.textContent = `Rs. ${revenue.toLocaleString()}`;
    };

    /* ==========================================
       3. DOM RENDER ENGINE
       ========================================== */
    const renderLists = () => {
        hideEmptyState();

        if (currentTab === "appointments") {
            appointmentsTable.classList.add("active");
            enquiriesTable.classList.remove("active");
            doctorFilterWrapper.style.display = "flex"; // Show doctor filter for appointments
            renderAppointments();
        } else {
            appointmentsTable.classList.remove("active");
            enquiriesTable.classList.add("active");
            doctorFilterWrapper.style.display = "none"; // Hide doctor filter for general enquiries
            renderEnquiries();
        }
    };

    const renderAppointments = () => {
        appointmentsTbody.innerHTML = "";
        const filtered = getFilteredAppointments();

        if (filtered.length === 0) {
            showEmptyState();
            return;
        }

        filtered.forEach(appt => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td class="date-cell">${formatDateStr(appt.date)}</td>
                <td class="patient-cell">${escapeHTML(appt.name)}</td>
                <td class="contact-cell">
                    <i class="fa-solid fa-phone"></i> <a href="tel:${appt.phone}">${escapeHTML(appt.phone)}</a><br>
                    <i class="fa-solid fa-envelope"></i> <a href="mailto:${appt.email}">${escapeHTML(appt.email)}</a>
                </td>
                <td>${appt.age} Yrs / <span style="text-transform: capitalize;">${appt.gender}</span></td>
                <td class="doctor-badge">${getDoctorLabel(appt.doctor)}</td>
                <td><span class="slot-badge ${appt.slot === 'morning' ? 'slot-morning' : 'slot-evening'}">${getSlotLabel(appt.slot)}</span></td>
                <td class="symptoms-cell" title="Click to expand symptoms">${escapeHTML(appt.message)}</td>
                <td>
                    <span class="payment-badge"><i class="fa-solid fa-receipt"></i> ${escapeHTML(appt.razorpay_payment_id || 'Cash')}</span>
                    <span style="font-size: 11px; color: var(--color-gray);">ID: ${escapeHTML((appt.razorpay_order_id || '').substring(0, 14))}...</span>
                </td>
                <td><span class="status-badge status-confirmed"><i class="fa-solid fa-circle-check"></i> Paid</span></td>
            `;
            appointmentsTbody.appendChild(tr);
        });
    };

    const renderEnquiries = () => {
        enquiriesTbody.innerHTML = "";
        const filtered = getFilteredEnquiries();

        if (filtered.length === 0) {
            showEmptyState();
            return;
        }

        filtered.forEach(enq => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td class="date-cell">${formatTimestamp(enq.timestamp)}</td>
                <td class="patient-cell">${escapeHTML(enq.name)}</td>
                <td class="contact-cell"><i class="fa-solid fa-envelope"></i> <a href="mailto:${enq.email}">${escapeHTML(enq.email)}</a></td>
                <td style="text-transform: capitalize; font-weight: 600; color: var(--color-secondary);">${escapeHTML(enq.reason).replace("-", " ")}</td>
                <td class="symptoms-cell" title="Click to view details">${escapeHTML(enq.message)}</td>
            `;
            enquiriesTbody.appendChild(tr);
        });
    };

    /* ==========================================
       4. LOCAL SEARCH & FILTER PIPELINE
       ========================================== */
    const getFilteredAppointments = () => {
        const searchText = searchFilter.value.toLowerCase().trim();
        const selectedDoctor = doctorFilter.value;
        const selectedDate = dateFilter.value; // YYYY-MM-DD

        return appointmentsData.filter(appt => {
            // Text Search
            const matchesSearch = 
                appt.name.toLowerCase().includes(searchText) || 
                appt.phone.includes(searchText) || 
                appt.email.toLowerCase().includes(searchText) || 
                appt.message.toLowerCase().includes(searchText);
            
            // Doctor Filter
            const matchesDoctor = !selectedDoctor || appt.doctor === selectedDoctor;
            
            // Date Filter
            const matchesDate = !selectedDate || appt.date === selectedDate;

            return matchesSearch && matchesDoctor && matchesDate;
        }).sort((a, b) => new Date(b.date + 'T00:00:00') - new Date(a.date + 'T00:00:00')); // sort by date descending
    };

    const getFilteredEnquiries = () => {
        const searchText = searchFilter.value.toLowerCase().trim();
        const selectedDate = dateFilter.value;

        return enquiriesData.filter(enq => {
            // Text Search
            const matchesSearch = 
                enq.name.toLowerCase().includes(searchText) || 
                enq.email.toLowerCase().includes(searchText) || 
                enq.message.toLowerCase().includes(searchText) ||
                enq.reason.toLowerCase().includes(searchText);
            
            // Date Filter (extract YYYY-MM-DD from timestamp ISO string)
            let matchesDate = true;
            if (selectedDate && enq.timestamp) {
                const enqDateStr = enq.timestamp.split("T")[0];
                matchesDate = enqDateStr === selectedDate;
            }

            return matchesSearch && matchesDate;
        }).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)); // sort by timestamp descending
    };

    // Filter listeners
    searchFilter.addEventListener("input", renderLists);
    doctorFilter.addEventListener("change", renderLists);
    dateFilter.addEventListener("change", renderLists);
    
    // Clear Filters
    clearFiltersBtn.addEventListener("click", () => {
        searchFilter.value = "";
        doctorFilter.value = "";
        dateFilter.value = "";
        renderLists();
    });

    /* ==========================================
       5. INTERACTIVE TAB NAVIGATION
       ========================================== */
    tabButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            tabButtons.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            
            currentTab = btn.getAttribute("data-tab");
            renderLists();
        });
    });

    /* ==========================================
       6. FORMATTERS & ESCAPERS (UTILITIES)
       ========================================== */
    const getDoctorLabel = (docId) => {
        switch (docId) {
            case "rashmi": return "Dr. Rashmi Patil";
            case "vaibhav": return "Dr. Vaibhav Patil";
            case "general": return "General OPD Physician";
            default: return docId || "OPD Duty Doctor";
        }
    };

    const getSlotLabel = (slotId) => {
        switch (slotId) {
            case "morning": return "Morning (10am-1pm)";
            case "evening": return "Evening (5pm-8pm)";
            default: return slotId || "General";
        }
    };

    const formatDateStr = (dateStr) => {
        if (!dateStr) return "N/A";
        const date = new Date(dateStr + "T00:00:00");
        return date.toLocaleDateString("en-US", { day: 'numeric', month: 'short', year: 'numeric' });
    };

    const formatTimestamp = (timestamp) => {
        if (!timestamp) return "N/A";
        const date = new Date(timestamp);
        return date.toLocaleString("en-US", { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    };

    const escapeHTML = (str) => {
        if (!str) return "";
        return str
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    };

    // Spinner view controls
    const showLoading = () => {
        loadingState.style.display = "block";
        appointmentsTable.style.opacity = "0.3";
        enquiriesTable.style.opacity = "0.3";
    };

    const hideLoading = () => {
        loadingState.style.display = "none";
        appointmentsTable.style.opacity = "1";
        enquiriesTable.style.opacity = "1";
    };

    const showEmptyState = () => {
        emptyState.style.display = "block";
    };

    const hideEmptyState = () => {
        emptyState.style.display = "none";
    };

    /* ==========================================
       7. ONLOAD TRIGGER
       ========================================== */
    checkAuthentication();

});
