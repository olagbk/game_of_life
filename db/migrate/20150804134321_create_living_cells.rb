class CreateLivingCells < ActiveRecord::Migration
  def change
    create_table :living_cells do |t|

      t.timestamps null: false
    end
  end
end
