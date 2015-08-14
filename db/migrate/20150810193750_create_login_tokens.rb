class CreateLoginTokens < ActiveRecord::Migration
  def change
    create_table :login_tokens do |t|
      t.string :token
      t.integer :user_id
      t.timestamps null: false
    end
  end
end
