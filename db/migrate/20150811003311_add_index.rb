class AddIndex < ActiveRecord::Migration
  def change
    add_index(:login_tokens, :token, unique: true)
  end
end
