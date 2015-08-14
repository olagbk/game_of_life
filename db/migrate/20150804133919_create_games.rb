class CreateGames < ActiveRecord::Migration
  def change
    create_table :games do |t|
      t.string :rows
      t.string :columns


      t.timestamps null: false
    end
  end
end
