package com.wakilimatch.app.ui.nav

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.wakilimatch.app.data.ApiService
import com.wakilimatch.app.data.AppState
import com.wakilimatch.app.ui.components.WakiliSnackbar
import com.wakilimatch.app.ui.screens.RoleSelectScreen
import com.wakilimatch.app.ui.screens.client.*
import com.wakilimatch.app.ui.screens.lawyer.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/**
 * Phase 2: the client flow (brief section B3) is fully real now. Lawyer
 * flow routes still use PlaceholderScreen - phase 3 replaces those without
 * touching this graph's shape (see the approved plan).
 */
@Composable
fun AppNavGraph(apiService: ApiService, appState: AppState) {
    val navController: NavHostController = rememberNavController()
    val snackbarHostState = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()

    fun showToast(message: String) {
        scope.launch { snackbarHostState.showSnackbar(message) }
    }

    fun popToRoleSelect() {
        appState.currentUser = null
        navController.navigate(Routes.ROLE_SELECT) {
            popUpTo(Routes.ROLE_SELECT) { inclusive = true }
        }
    }

    // intake sub-mode for the Post-a-Case step 1 screens (assistant vs scan)
    var intakeMode by remember { mutableStateOf("assistant") }

    Box(modifier = androidx.compose.ui.Modifier.fillMaxSize()) {
    NavHost(navController = navController, startDestination = Routes.ROLE_SELECT) {
        composable(Routes.ROLE_SELECT) {
            RoleSelectScreen(
                onClient = { navController.navigate(Routes.CLIENT_LOGIN) },
                onLawyer = { navController.navigate(Routes.LAWYER_LOGIN) },
            )
        }

        // ─── Client flow ────────────────────────────────────────────────────
        composable(Routes.CLIENT_LOGIN) {
            ClientLoginScreen(
                apiService = apiService,
                onBack = { navController.popBackStack() },
                onAuthSuccess = { user ->
                    appState.currentUser = user
                    navController.navigate(Routes.CLIENT_DASHBOARD) { popUpTo(Routes.ROLE_SELECT) }
                },
            )
        }
        composable(Routes.CLIENT_DASHBOARD) {
            val user = appState.currentUser
            if (user != null) {
                ClientDashboardScreen(
                    currentUser = user,
                    onMyCases = { navController.navigate(Routes.CLIENT_MY_CASES) },
                    onNewCase = {
                        appState.caseState.reset()
                        intakeMode = "assistant"
                        navController.navigate(Routes.AI_ASSISTANT)
                    },
                    onSignOut = { popToRoleSelect() },
                )
            }
        }
        composable(Routes.CLIENT_MY_CASES) {
            val user = appState.currentUser
            if (user != null) {
                MyCasesScreen(apiService = apiService, currentUser = user, onBack = { navController.popBackStack() })
            }
        }
        composable(Routes.AI_ASSISTANT) {
            if (intakeMode == "scan") {
                ScanDocumentScreen(
                    onBack = { intakeMode = "assistant" },
                    onUseInfo = { draft ->
                        applyDraft(appState, draft)
                        navController.navigate(Routes.POST_CASE_CATEGORY)
                    },
                )
            } else {
                AiAssistantScreen(
                    apiService = apiService,
                    onBack = { navController.popBackStack() },
                    onSwitchToScan = { intakeMode = "scan" },
                    onSkipManual = { navController.navigate(Routes.POST_CASE_CATEGORY) },
                    onContinue = { draft ->
                        applyDraft(appState, draft)
                        navController.navigate(Routes.POST_CASE_CATEGORY)
                    },
                )
            }
        }
        // kept as its own route for back-stack symmetry with the plan's nav
        // map, but intake mode is actually toggled in-place above
        composable(Routes.SCAN_DOCUMENT) {
            ScanDocumentScreen(
                onBack = { navController.popBackStack() },
                onUseInfo = { draft ->
                    applyDraft(appState, draft)
                    navController.navigate(Routes.POST_CASE_CATEGORY)
                },
            )
        }
        composable(Routes.POST_CASE_CATEGORY) {
            PostCaseCategoryScreen(
                caseState = appState.caseState,
                onBack = { navController.popBackStack() },
                onNext = { navController.navigate(Routes.POST_CASE_DETAILS) },
            )
        }
        composable(Routes.POST_CASE_DETAILS) {
            val user = appState.currentUser
            if (user != null) {
                PostCaseDetailsScreen(
                    apiService = apiService,
                    currentUser = user,
                    caseState = appState.caseState,
                    onBack = { navController.popBackStack() },
                    onSubmitted = { navController.navigate(Routes.MATCH_RESULTS) },
                )
            }
        }
        composable(Routes.MATCH_RESULTS) {
            MatchResultsScreen(
                caseState = appState.caseState,
                onBack = { navController.popBackStack(Routes.CLIENT_DASHBOARD, inclusive = false) },
                onOpenProfile = { match ->
                    appState.selectedMatch = match
                    navController.navigate(Routes.LAWYER_PROFILE_VIEW)
                },
                onRephrase = { navController.navigate(Routes.POST_CASE_DETAILS) },
            )
        }
        composable(Routes.LAWYER_PROFILE_VIEW) {
            val match = appState.selectedMatch
            if (match != null) {
                LawyerProfileViewScreen(
                    apiService = apiService,
                    match = match,
                    caseId = appState.caseState.caseId,
                    onBack = { navController.popBackStack() },
                    onConfirmed = { navController.navigate(Routes.CLIENT_DASHBOARD) { popUpTo(Routes.CLIENT_DASHBOARD) { inclusive = true } } },
                    onShowToast = ::showToast,
                )
            }
        }

        // ─── Lawyer flow ────────────────────────────────────────────────────
        composable(Routes.LAWYER_LOGIN) {
            LawyerLoginScreen(
                apiService = apiService,
                onBack = { navController.popBackStack() },
                onAuthSuccess = { user ->
                    appState.currentUser = user
                    scope.launch {
                        val incomplete = try {
                            withContext(Dispatchers.IO) {
                                val resp = apiService.getLawyerProfile(user.id)
                                val p = if (resp.isSuccessful) resp.body() else null
                                p?.biography.isNullOrBlank() || p?.specializations.isNullOrBlank()
                            }
                        } catch (e: Exception) {
                            false
                        }
                        val destination = if (incomplete) Routes.LAWYER_ONBOARDING else Routes.LAWYER_DASHBOARD
                        navController.navigate(destination) { popUpTo(Routes.ROLE_SELECT) }
                    }
                },
            )
        }
        composable(Routes.LAWYER_ONBOARDING) {
            val user = appState.currentUser
            if (user != null) {
                LawyerOnboardingScreen(
                    apiService = apiService,
                    currentUser = user,
                    onBack = { navController.popBackStack() },
                    onComplete = {
                        navController.navigate(Routes.LAWYER_DASHBOARD) { popUpTo(Routes.LAWYER_ONBOARDING) { inclusive = true } }
                    },
                )
            }
        }
        composable(Routes.LAWYER_DASHBOARD) {
            val user = appState.currentUser
            if (user != null) {
                LawyerDashboardScreen(
                    apiService = apiService,
                    currentUser = user,
                    onInquiries = { navController.navigate(Routes.LAWYER_INQUIRIES) },
                    onMyCases = { navController.navigate(Routes.LAWYER_MY_CASES) },
                    onProfile = { navController.navigate(Routes.LAWYER_OWN_PROFILE) },
                    onCompleteProfile = { navController.navigate(Routes.LAWYER_ONBOARDING) },
                    onSignOut = { popToRoleSelect() },
                )
            }
        }
        composable(Routes.LAWYER_INQUIRIES) {
            val user = appState.currentUser
            if (user != null) {
                LawyerInquiriesScreen(
                    apiService = apiService,
                    currentUser = user,
                    onBack = { navController.popBackStack() },
                    onOpenCase = { c ->
                        appState.selectedLawyerCase = c
                        navController.navigate(Routes.LAWYER_CASE_DETAIL)
                    },
                )
            }
        }
        composable(Routes.LAWYER_MY_CASES) {
            val user = appState.currentUser
            if (user != null) {
                LawyerMyCasesScreen(
                    apiService = apiService,
                    currentUser = user,
                    onBack = { navController.popBackStack() },
                    onOpenCase = { c ->
                        appState.selectedLawyerCase = c
                        navController.navigate(Routes.LAWYER_CASE_DETAIL)
                    },
                )
            }
        }
        composable(Routes.LAWYER_CASE_DETAIL) {
            val user = appState.currentUser
            val caseView = appState.selectedLawyerCase
            if (user != null && caseView != null) {
                LawyerCaseDetailScreen(
                    apiService = apiService,
                    currentUser = user,
                    initialCase = caseView,
                    onBack = { navController.popBackStack() },
                )
            }
        }
        composable(Routes.LAWYER_OWN_PROFILE) {
            val user = appState.currentUser
            if (user != null) {
                LawyerOwnProfileScreen(
                    apiService = apiService,
                    currentUser = user,
                    onBack = { navController.popBackStack() },
                    onEdit = { navController.navigate(Routes.LAWYER_ONBOARDING) },
                )
            }
        }
    }
    SnackbarHost(
        hostState = snackbarHostState,
        modifier = androidx.compose.ui.Modifier
            .align(androidx.compose.ui.Alignment.BottomCenter)
            .navigationBarsPadding(),
    ) { data -> WakiliSnackbar(data) }
    }
}

private fun applyDraft(appState: AppState, draft: com.wakilimatch.app.data.DraftCaseResponse) {
    val cs = appState.caseState
    draft.title?.let { cs.title = it }
    draft.description?.let { cs.description = it }
    draft.urgency?.let { cs.urgencyLevel = it }
    draft.category?.let { cs.legalCategory = it }
    // draft.jurisdiction is already resolved against the real county list
    // server-side (services/countyValidator.js, Deliverable 4 bug 2) - it's
    // either a real canonical county name or null, never raw free text.
    draft.jurisdiction?.let { cs.jurisdiction = it }
}
