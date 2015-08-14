class RemoveLoginTokenFromUser < ActiveRecord::Migration
  def change
    remove_column :users, :login_token, :string
  end
end
