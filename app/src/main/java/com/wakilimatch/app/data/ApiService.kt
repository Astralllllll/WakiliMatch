package com.wakilimatch.app.data

import retrofit2.Response
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path

interface ApiService {
    @GET("api/health")
    suspend fun checkHealth(): HealthResponse

    @POST("api/auth/client/login")
    suspend fun loginClient(@Body body: LoginRequest): Response<AuthResponse>

    @POST("api/auth/client/register")
    suspend fun registerClient(@Body body: RegisterClientRequest): Response<AuthResponse>

    @POST("api/auth/lawyer/login")
    suspend fun loginLawyer(@Body body: LawyerLoginRequest): Response<AuthResponse>

    @POST("api/auth/lawyer/register")
    suspend fun registerLawyer(@Body body: RegisterLawyerRequest): Response<AuthResponse>

    @GET("api/issues/client/{clientId}")
    suspend fun getClientIssues(@Path("clientId") clientId: String): ClientIssuesResponse

    @POST("api/issues")
    suspend fun createIssue(@Body body: CreateIssueRequest): Response<CreateIssueResponse>

    @GET("api/lawyers")
    suspend fun getLawyers(): List<Lawyer>

    companion object {
        fun create(): ApiService {
            val retrofit = Retrofit.Builder()
                .baseUrl("http://10.0.2.2:5000/")
                .addConverterFactory(GsonConverterFactory.create())
                .build()
            return retrofit.create(ApiService::class.java)
        }
    }
}
