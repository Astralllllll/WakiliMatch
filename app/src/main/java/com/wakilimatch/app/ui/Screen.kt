package com.wakilimatch.app.ui

sealed class Screen {
    object Auth : Screen()
    object Dashboard : Screen()
    object SubmitIssue : Screen()
    object LawyersList : Screen()
}
