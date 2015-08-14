class AddPasswordToUser < ActiveRecord::Migration
  def change
    add_column :users, :password, :string
    add_column :users, :name, :string
  end
end
