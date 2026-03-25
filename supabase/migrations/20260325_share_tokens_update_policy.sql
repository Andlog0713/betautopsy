create policy "Users can update own share tokens" on share_tokens for update using (auth.uid() = user_id);
