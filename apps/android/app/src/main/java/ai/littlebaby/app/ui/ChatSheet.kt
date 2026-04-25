package ai.littlebaby.app.ui

import androidx.compose.runtime.Composable
import ai.littlebaby.app.MainViewModel
import ai.littlebaby.app.ui.chat.ChatSheetContent

@Composable
fun ChatSheet(viewModel: MainViewModel) {
  ChatSheetContent(viewModel = viewModel)
}
