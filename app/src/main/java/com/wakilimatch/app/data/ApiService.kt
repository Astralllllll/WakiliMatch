package com.wakilimatch.app.data

import retrofit2.Response
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import okhttp3.OkHttpClient
import java.util.concurrent.TimeUnit


interface ApiService {
    @GET("api/health")
    suspend fun checkHealth(): HealthResponse

    // ─── Auth ───────────────────────────────────────────────────────────────
    @POST("api/auth/client/login")
    suspend fun loginClient(@Body body: LoginRequest): Response<AuthResponse>

    @POST("api/auth/client/register")
    suspend fun registerClient(@Body body: RegisterClientRequest): Response<AuthResponse>

    @POST("api/auth/lawyer/login")
    suspend fun loginLawyer(@Body body: LawyerLoginRequest): Response<AuthResponse>

    @POST("api/auth/lawyer/register")
    suspend fun registerLawyer(@Body body: RegisterLawyerRequest): Response<AuthResponse>

    // ─── Issues ─────────────────────────────────────────────────────────────
    @GET("api/issues/client/{clientId}")
    suspend fun getClientIssues(@Path("clientId") clientId: String): ClientIssuesResponse

    @POST("api/issues")
    suspend fun createIssue(@Body body: CreateIssueRequest): Response<CreateIssueResponse>

    // ─── Lawyers (browse + profile) ─────────────────────────────────────────
    @GET("api/lawyers")
    suspend fun getLawyers(): List<Lawyer>

    @GET("api/lawyers/{userId}")
    suspend fun getLawyerProfile(@Path("userId") userId: String): Response<Lawyer>

    @GET("api/lawyers/{lawyerId}/past-cases")
    suspend fun getPastCases(@Path("lawyerId") lawyerId: String): PastCasesResponse

    @POST("api/lawyers/{lawyerId}/past-cases")
    suspend fun addPastCase(@Path("lawyerId") lawyerId: String, @Body body: AddPastCaseRequest): Response<AddPastCaseResponse>

    // ─── Lawyer onboarding / profile edit (Deliverable 4, bug 1) ───────────
    @POST("api/profiles/lawyer")
    suspend fun saveLawyerProfile(@Body body: SaveLawyerProfileRequest): Response<SaveLawyerProfileResponse>

    // ─── Matches (brief sections A1-A4, B4, B5) ─────────────────────────────
    @POST("api/matches/generate")
    suspend fun generateMatches(@Body body: GenerateMatchesRequest): GenerateMatchesResponse

    @GET("api/matches/issue/{issueId}")
    suspend fun getIssueMatches(@Path("issueId") issueId: String): IssueMatchesResponse

    @POST("api/matches/select")
    suspend fun selectLawyer(@Body body: SelectLawyerRequest): Response<SelectLawyerResponse>

    @POST("api/matches/decision")
    suspend fun matchDecision(@Body body: MatchDecisionRequest): Response<MatchDecisionResponse>

    @GET("api/matches/case/{matchId}")
    suspend fun getCaseDetail(@Path("matchId") matchId: String): LawyerCaseDetailResponse

    @GET("api/matches/lawyer/{lawyerId}")
    suspend fun getLawyerCases(@Path("lawyerId") lawyerId: String): LawyerCasesResponse

    // ─── AI provider interface (brief section B6) ───────────────────────────
    @GET("api/ai/status")
    suspend fun getAiStatus(): AiStatusResponse

    @POST("api/ai/draft-case")
    suspend fun draftCase(@Body body: DraftCaseRequest): Response<DraftCaseResponse>

    companion object {
        fun create(): ApiService {
            val client = OkHttpClient.Builder()
                .connectTimeout(30, TimeUnit.SECONDS)
                .readTimeout(60, TimeUnit.SECONDS)
                .build()

            val retrofit = Retrofit.Builder()
                .baseUrl("http://192.168.100.3:5000/")
                .client(client)
                .addConverterFactory(GsonConverterFactory.create())
                .build()
            return retrofit.create(ApiService::class.java)
        }
    }
}
